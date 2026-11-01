import { createTestDb } from "@tech-radar/db/testing";
import type { DbHandle } from "@tech-radar/db";
import { canonicalProducts, dedupeReviews, matchEvidence, productListings, seedSources, sources } from "@tech-radar/db";
import type { ScrapedListing } from "@tech-radar/sources";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ingestListings } from "./pipeline.js";

let handle: DbHandle;
let sourceId: string;

const observedAt = new Date("2026-11-01T10:00:00Z");

function listing(overrides: Partial<ScrapedListing> & { sourceUrl: string; title: string }): ScrapedListing {
  return {
    sourceCode: "gearvn",
    externalId: null,
    brand: null,
    model: null,
    mpn: null,
    sku: null,
    priceCurrent: 1_000_000,
    priceOriginal: null,
    currency: "VND",
    stockStatus: "InStock",
    specs: {},
    rawPayload: { kind: "test" },
    ...overrides,
  };
}

beforeAll(async () => {
  handle = await createTestDb();
  await seedSources(handle.db);
  const [gearvn] = await handle.db.select().from(sources).where(eq(sources.code, "gearvn"));
  sourceId = gearvn!.id;
});

afterAll(async () => {
  await handle.close();
});

describe("listing → canonical linking", () => {
  it("creates a canonical product for the first listing", async () => {
    const result = await ingestListings(
      handle.db,
      sourceId,
      [
        listing({
          sourceUrl: "https://gearvn.com/products/kb-a",
          title: "Bàn phím ASUS ROG Azoth 96 HE White",
          brand: "ASUS",
          model: "ROG Azoth 96 HE",
          sku: "KB-ASUS-1",
        }),
      ],
      observedAt,
      { category: "mechanical_keyboard" },
    );

    expect(result.linked).toMatchObject({ created: 1, attached: 0, review: 0 });

    const [product] = await handle.db.select().from(canonicalProducts);
    expect(product).toMatchObject({
      brand: "ASUS",
      sku: "KB-ASUS-1",
      category: "mechanical_keyboard",
      status: "active",
    });

    const [stored] = await handle.db.select().from(productListings);
    expect(stored!.productId).toBe(product!.id);
  });

  it("auto-attaches a listing with the same SKU and records evidence", async () => {
    const result = await ingestListings(
      handle.db,
      sourceId,
      [
        listing({
          sourceUrl: "https://gearvn.com/products/kb-a-variant",
          title: "Bàn phím ASUS ROG Azoth 96 HE White (hàng mới)",
          brand: "ASUS",
          model: "ROG Azoth 96 HE",
          sku: "kb-asus-1",
        }),
      ],
      observedAt,
      { category: "mechanical_keyboard" },
    );

    expect(result.linked).toMatchObject({ attached: 1 });

    const products = await handle.db.select().from(canonicalProducts);
    expect(products).toHaveLength(1);

    const evidence = await handle.db.select().from(matchEvidence).where(eq(matchEvidence.method, "sku_match"));
    expect(evidence.length).toBeGreaterThan(0);
  });

  it("keeps uncertain matches separate and queues a review", async () => {
    const result = await ingestListings(
      handle.db,
      sourceId,
      [
        listing({
          sourceUrl: "https://gearvn.com/products/kb-a-other-switch",
          title: "Bàn phím ASUS ROG Azoth 96 HE White",
          brand: "ASUS",
          model: "ROG Azoth 96 HE",
          sku: "KB-ASUS-2",
        }),
      ],
      observedAt,
      { category: "mechanical_keyboard" },
    );

    expect(result.linked).toMatchObject({ review: 1 });

    const products = await handle.db.select().from(canonicalProducts);
    expect(products).toHaveLength(2);

    const reviews = await handle.db.select().from(dedupeReviews);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ status: "pending", method: "brand_model_match", confidence: "high" });
    expect(Number(reviews[0]!.score)).toBeCloseTo(0.92, 4);
  });

  it("does not re-link on later runs and never merges canonicals", async () => {
    const result = await ingestListings(
      handle.db,
      sourceId,
      [
        listing({
          sourceUrl: "https://gearvn.com/products/kb-a",
          title: "Bàn phím ASUS ROG Azoth 96 HE White",
          brand: "ASUS",
          model: "ROG Azoth 96 HE",
          sku: "KB-ASUS-1",
        }),
      ],
      new Date("2026-11-02T10:00:00Z"),
      { category: "mechanical_keyboard" },
    );

    expect(result.linked).toMatchObject({ skipped: 1 });
    expect(await handle.db.select().from(canonicalProducts)).toHaveLength(2);
    expect(await handle.db.select().from(dedupeReviews)).toHaveLength(1);
  });
});
