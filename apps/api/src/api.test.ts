import type { FastifyInstance } from "fastify";
import { buildApp, type BuildAppOptions } from "./app.js";
import type { RunSourceOptions, RunSourceResult } from "@tech-radar/worker";
import { createTestDb } from "@tech-radar/db/testing";
import type { DbHandle } from "@tech-radar/db";
import {
  canonicalProducts,
  dedupeReviews,
  priceHistory,
  productListings,
  scrapeRuns,
  seedSources,
  sources,
} from "@tech-radar/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let handle: DbHandle;
let app: FastifyInstance;

let azothId: string;
let logitechId: string;

beforeAll(async () => {
  handle = await createTestDb();
  await seedSources(handle.db);

  const rows = await handle.db.select().from(sources);
  const gearvn = rows.find((row) => row.code === "gearvn")!;
  const phongvu = rows.find((row) => row.code === "phongvu")!;

  const [azoth] = await handle.db
    .insert(canonicalProducts)
    .values({
      name: "Bàn phím gaming ASUS ROG Azoth 96 HE White",
      brand: "ASUS",
      model: "ROG Azoth 96 HE",
      category: "mechanical_keyboard",
      specs: { "Chất liệu vỏ": "Kim loại", "Đèn LED": "RGB" },
    })
    .returning({ id: canonicalProducts.id });
  azothId = azoth!.id;

  const [logitech] = await handle.db
    .insert(canonicalProducts)
    .values({
      name: "Chuột gaming Logitech G304 X Superlight Black",
      brand: "Logitech",
      model: "G304 X",
      category: "gaming_mouse",
      specs: { "Kết nối": "Wireless" },
    })
    .returning({ id: canonicalProducts.id });
  logitechId = logitech!.id;

  const [azothGearvn] = await handle.db
    .insert(productListings)
    .values({
      productId: azothId,
      sourceId: gearvn.id,
      sourceUrl: "https://gearvn.com/products/ban-phim-gaming-asus-rog-azoth-96-he-white",
      title: "Bàn phím gaming ASUS ROG Azoth 96 HE White",
      brand: "ASUS",
      sku: "KB-ASUS-M902",
      priceCurrent: "9590000.00",
      stockStatus: "InStock",
      rawPayload: { kind: "test" },
    })
    .returning({ id: productListings.id });

  await handle.db.insert(productListings).values([
    {
      productId: azothId,
      sourceId: phongvu.id,
      sourceUrl: "https://phongvu.vn/ban-phim-azoth-96-he-white",
      title: "Bàn phím cơ ASUS ROG Azoth 96 HE White",
      priceCurrent: "9890000.00",
      stockStatus: "InStock",
      rawPayload: { kind: "test" },
    },
    {
      productId: logitechId,
      sourceId: gearvn.id,
      sourceUrl: "https://gearvn.com/products/chuot-gaming-logitech-g304-x-superlight-black",
      title: "Chuột gaming không dây Logitech G304 X Superlight Black",
      priceCurrent: "1790000.00",
      stockStatus: "InStock",
      rawPayload: { kind: "test" },
    },
  ]);

  await handle.db.insert(priceHistory).values([
    {
      listingId: azothGearvn!.id,
      priceCurrent: "9900000.00",
      stockStatus: "InStock",
      observedAt: new Date("2026-10-01T00:00:00Z"),
      sourceUrl: "https://gearvn.com/products/ban-phim-gaming-asus-rog-azoth-96-he-white",
    },
    {
      listingId: azothGearvn!.id,
      priceCurrent: "9590000.00",
      stockStatus: "InStock",
      observedAt: new Date("2026-11-01T00:00:00Z"),
      sourceUrl: "https://gearvn.com/products/ban-phim-gaming-asus-rog-azoth-96-he-white",
    },
  ]);

  await handle.db.insert(scrapeRuns).values({
    sourceId: gearvn.id,
    trigger: "manual",
    status: "success",
    startedAt: new Date("2026-11-01T10:00:00Z"),
    finishedAt: new Date("2026-11-01T10:01:00Z"),
    listingsFound: 20,
    listingsNew: 20,
  });

  app = await buildApp({ db: handle.db });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await handle.close();
});

describe("GET /api/products", () => {
  it("lists products with every store's price kept separate", async () => {
    const response = await app.inject({ method: "GET", url: "/api/products" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(2);
    const azoth = body.items.find((item: any) => item.id === azothId);
    expect(azoth.listings).toHaveLength(2);
    expect(azoth.bestPrice).toBe(9590000);
    expect(azoth.listings.map((l: any) => l.source).sort()).toEqual(["gearvn", "phongvu"]);
  });

  it("filters by query and category", async () => {
    const azoth = (await app.inject({ method: "GET", url: "/api/products?q=azoth" })).json();
    expect(azoth.total).toBe(1);
    expect(azoth.items[0].id).toBe(azothId);

    const mice = (await app.inject({ method: "GET", url: "/api/products?category=gaming_mouse" })).json();
    expect(mice.total).toBe(1);
    expect(mice.items[0].id).toBe(logitechId);
  });
});

describe("GET /api/products/:id", () => {
  it("returns listings with price history", async () => {
    const response = await app.inject({ method: "GET", url: `/api/products/${azothId}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.product.id).toBe(azothId);
    const gearvnListing = body.listings.find((listing: any) => listing.source === "gearvn");
    expect(gearvnListing.priceCurrent).toBe(9590000);
    expect(gearvnListing.history).toHaveLength(2);
    // newest observation first
    expect(gearvnListing.history[0].price).toBe(9590000);
    expect(gearvnListing.history[1].price).toBe(9900000);
  });

  it("404s for unknown ids", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/products/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("GET /api/compare", () => {
  it("returns offers and the union of spec keys", async () => {
    const response = await app.inject({ method: "GET", url: `/api/compare?ids=${azothId},${logitechId}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.products).toHaveLength(2);
    expect(body.specKeys).toEqual(["Chất liệu vỏ", "Kết nối", "Đèn LED"].sort());
  });

  it("validates ids", async () => {
    expect((await app.inject({ method: "GET", url: "/api/compare" })).statusCode).toBe(400);
  });
});

describe("operational endpoints", () => {
  it("returns source statuses", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/sources" })).json();
    expect(body.items.map((item: any) => item.code)).toEqual(["cellphones", "gearvn", "phongvu"]);
    expect(body.items.find((item: any) => item.code === "gearvn").status).toBe("approved_for_use");
  });

  it("returns recent runs", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/runs" })).json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ source: "gearvn", status: "success", listingsFound: 20 });
  });

  it("returns the pending review queue", async () => {
    const body = (await app.inject({ method: "GET", url: "/api/reviews" })).json();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("decides a pending review", async () => {
    const [review] = await handle.db
      .insert(dedupeReviews)
      .values({
        productId: azothId,
        listingIds: [],
        method: "name_similarity",
        confidence: "medium",
        reason: "test",
        status: "pending",
      })
      .returning({ id: dedupeReviews.id });
    // create a listing attached to its own canonical to merge
    const [ownCanonical] = await handle.db
      .insert(canonicalProducts)
      .values({ name: "Candidate KB", brand: "ASUS", category: "mechanical_keyboard", status: "active" })
      .returning({ id: canonicalProducts.id });
    const [listing] = await handle.db
      .insert(productListings)
      .values({
        productId: ownCanonical!.id,
        sourceId: (await handle.db.select().from(sources).then((r) => r.find((x) => x.code === "gearvn")!.id)),
        sourceUrl: "https://gearvn.com/products/candidate-kb",
        title: "Candidate KB",
        priceCurrent: "1000.00",
        stockStatus: "InStock",
        rawPayload: { kind: "test" },
      })
      .returning({ id: productListings.id });
    await handle.db
      .update(dedupeReviews)
      .set({ listingIds: [listing!.id] })
      .where(eq(dedupeReviews.id, review!.id));

    const accept = await app.inject({
      method: "POST",
      url: `/api/reviews/${review!.id}/decision`,
      payload: { decision: "accept" },
    });
    expect(accept.statusCode).toBe(200);
    const updated = await handle.db.select().from(dedupeReviews).where(eq(dedupeReviews.id, review!.id));
    expect(updated[0]!.status).toBe("merged");
    const mergedListing = await handle.db.select().from(productListings).where(eq(productListings.id, listing!.id));
    expect(mergedListing[0]!.productId).toBe(azothId);
  });

  it("triggers a scrape run through the injected runner", async () => {
    const calls: string[] = [];
    const stubResult: RunSourceResult = {
      runId: "run-stub",
      status: "success",
      listingsFound: 3,
      listingsNew: 3,
      listingsUpdated: 0,
      historyAppended: 3,
      linked: { attached: 0, created: 3, review: 0, skipped: 0 },
      errors: [],
    };
    const triggered = await buildApp({
      db: handle.db,
      runSourceImpl: (async (options: RunSourceOptions) => {
        calls.push(options.adapter.code);
        return stubResult;
      }) as unknown as NonNullable<BuildAppOptions["runSourceImpl"]>,
    });
    await triggered.ready();

    const single = await triggered.inject({
      method: "POST",
      url: "/api/runs/trigger",
      payload: { source: "phongvu" },
    });
    expect(single.statusCode).toBe(200);
    expect(single.json()).toMatchObject({ status: "success", listingsFound: 3 });
    expect(calls).toEqual(["phongvu"]);

    const all = await triggered.inject({
      method: "POST",
      url: "/api/runs/trigger",
      payload: { source: "all" },
    });
    expect(all.statusCode).toBe(200);
    expect(all.json().items).toHaveLength(2);
    expect(calls).toEqual(["phongvu", "gearvn", "phongvu"]);

    await triggered.close();
  });

  it("requires the bearer token when configured", async () => {
    const secured = await buildApp({ db: handle.db, token: "secret-token" });
    await secured.ready();
    expect((await secured.inject({ method: "GET", url: "/api/products" })).statusCode).toBe(401);
    const ok = await secured.inject({
      method: "GET",
      url: "/api/products",
      headers: { authorization: "Bearer secret-token" },
    });
    expect(ok.statusCode).toBe(200);
    expect((await secured.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
    await secured.close();
  });
});
