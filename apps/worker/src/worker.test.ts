import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createTestDb } from "@tech-radar/db/testing";
import type { DbHandle } from "@tech-radar/db";
import { seedSources, priceHistory, productListings, sources, scrapeRuns } from "@tech-radar/db";
import { gearvnAdapter, type SourceAdapter } from "@tech-radar/sources";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSource } from "./run.js";

const fixture = (name: string): string =>
  readFileSync(new URL(`../../../tests/fixtures/sources/gearvn/${name}`, import.meta.url), "utf8");

const keyboardHtml = fixture("ban-phim-co.html");
const mouseHtml = fixture("gaming-mouse.html");
const productHtml = fixture("product-azoth-96-he-white.html");

let server: Server;
let baseUrl: string;
let handle: DbHandle;
let sourceId: string;

const routes = new Map<string, { status: number; body: string }>();

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const route = routes.get(path);
    if (!route) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(route.status, { "content-type": "text/html; charset=utf-8" }).end(route.body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  routes.set("/collections/ban-phim-co", { status: 200, body: keyboardHtml });
  routes.set("/collections/gaming-mouse", { status: 200, body: mouseHtml });
  routes.set("/products/ban-phim-gaming-asus-rog-azoth-96-he-white", { status: 200, body: productHtml });

  handle = await createTestDb();
  await seedSources(handle.db);
  const [gearvn] = await handle.db.select().from(sources).where(eq(sources.code, "gearvn"));
  sourceId = gearvn!.id;
});

afterAll(async () => {
  await handle.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const offlineAdapter = (overrides: Partial<SourceAdapter> = {}): SourceAdapter => ({
  ...gearvnAdapter,
  baseUrl,
  minDelayMs: 1,
  ...overrides,
});

async function countListings(): Promise<number> {
  const [row] = await handle.db.select({ count: sql<number>`count(*)::int` }).from(productListings);
  return row!.count;
}

async function countHistory(): Promise<number> {
  const [row] = await handle.db.select({ count: sql<number>`count(*)::int` }).from(priceHistory);
  return row!.count;
}

describe("runSource against fixture server (offline)", () => {
  it("ingests both categories on the first run", async () => {
    const result = await runSource({
      db: handle.db,
      adapter: offlineAdapter(),
      now: () => new Date("2026-11-01T10:00:00Z"),
    });

    expect(result.status).toBe("success");
    expect(result.listingsFound).toBe(40);
    expect(result.listingsNew).toBe(40);
    expect(result.listingsUpdated).toBe(0);
    expect(result.historyAppended).toBe(40);
    expect(result.errors).toEqual([]);

    expect(await countListings()).toBe(40);
    expect(await countHistory()).toBe(40);

    const [run] = await handle.db.select().from(scrapeRuns).orderBy(scrapeRuns.createdAt);
    expect(run!.status).toBe("success");
    expect(run!.listingsFound).toBe(40);
  });

  it("is idempotent on re-run and appends no history when nothing changed", async () => {
    const result = await runSource({
      db: handle.db,
      adapter: offlineAdapter(),
      now: () => new Date("2026-11-01T16:00:00Z"),
    });

    expect(result.listingsNew).toBe(0);
    expect(result.listingsUpdated).toBe(40);
    expect(result.historyAppended).toBe(0);
    expect(await countListings()).toBe(40);
    expect(await countHistory()).toBe(40);

    const [azoth] = await handle.db
      .select()
      .from(productListings)
      .where(and(eq(productListings.sourceId, sourceId), eq(productListings.title, "Bàn phím gaming ASUS ROG Azoth 96 HE White")));
    expect(azoth!.firstSeenAt.toISOString()).toBe("2026-11-01T10:00:00.000Z");
    expect(azoth!.lastSeenAt.toISOString()).toBe("2026-11-01T16:00:00.000Z");
    expect(azoth!.rawPayload).toMatchObject({ parsed: { kind: "category_card" } });
  });

  it("enriches identifiers from the product detail page", async () => {
    const result = await runSource({
      db: handle.db,
      adapter: offlineAdapter(),
      categoryPaths: ["/collections/ban-phim-co"],
      enrichDetails: true,
      maxDetailFetches: 1,
      now: () => new Date("2026-11-02T10:00:00Z"),
    });

    expect(result.status).toBe("success");
    const [azoth] = await handle.db
      .select()
      .from(productListings)
      .where(and(eq(productListings.sourceId, sourceId), eq(productListings.title, "Bàn phím gaming ASUS ROG Azoth 96 HE White")));
    expect(azoth!.brand).toBe("ASUS");
    expect(azoth!.sku).toBe("KB-ASUS-M902-ROG-AZOTH-96-HE-WHI");
    expect(azoth!.stockStatus).toBe("InStock");
    expect(azoth!.specs).toMatchObject({ "Chất liệu vỏ": "Kim loại" });
  });

  it("appends exactly one history row when a price changes", async () => {
    const card = (price: string) =>
      `<html><body><a class="product-card" href="/products/synthetic-1">
        <p class="product-card-name">Bàn phím Test</p>
        <span class="product-card-price-sale">${price}</span>
      </a></body></html>`;

    routes.set("/collections/synthetic", { status: 200, body: card("1.000.000đ") });
    const synthetic: SourceAdapter = {
      ...gearvnAdapter,
      baseUrl,
      minDelayMs: 1,
      categories: [{ path: "/collections/synthetic", category: "mechanical_keyboard", label: "Synthetic" }],
    };

    const first = await runSource({
      db: handle.db,
      adapter: synthetic,
      now: () => new Date("2026-11-03T10:00:00Z"),
    });
    expect(first).toMatchObject({ status: "success", listingsNew: 1, historyAppended: 1 });

    const second = await runSource({
      db: handle.db,
      adapter: synthetic,
      now: () => new Date("2026-11-03T16:00:00Z"),
    });
    expect(second).toMatchObject({ listingsUpdated: 1, historyAppended: 0 });

    routes.set("/collections/synthetic", { status: 200, body: card("900.000đ") });
    const third = await runSource({
      db: handle.db,
      adapter: synthetic,
      now: () => new Date("2026-11-04T10:00:00Z"),
    });
    expect(third).toMatchObject({ listingsUpdated: 1, historyAppended: 1 });

    const [listing] = await handle.db
      .select()
      .from(productListings)
      .where(eq(productListings.sourceUrl, `${baseUrl}/products/synthetic-1`));
    const rows = await handle.db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.listingId, listing!.id))
      .orderBy(priceHistory.observedAt);
    expect(rows.map((row) => row.priceCurrent)).toEqual(["1000000.00", "900000.00"]);
  });

  it("records failures in the run instead of throwing", async () => {
    const broken: SourceAdapter = {
      ...gearvnAdapter,
      baseUrl,
      minDelayMs: 1,
      categories: [{ path: "/collections/missing", category: "gaming_mouse", label: "Missing" }],
    };
    const result = await runSource({ db: handle.db, adapter: broken });
    expect(result.status).toBe("failed");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain("404");
  });
});
