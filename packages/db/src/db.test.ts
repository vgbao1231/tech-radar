import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./testing.js";
import type { DbHandle } from "./client.js";
import { priceHistory, productListings, sources } from "./schema.js";
import { seedSources } from "./seed.js";

let handle: DbHandle;

beforeAll(async () => {
  handle = await createTestDb({ seed: true });
});

afterAll(async () => {
  await handle.close();
});

async function tableNames(): Promise<string[]> {
  const result = await handle.db.execute(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  );
  return result.rows.map((row: any) => row.table_name as string);
}

describe("schema/migration", () => {
  it("creates every table from DATA_MODEL.md", async () => {
    expect(await tableNames()).toEqual([
      "canonical_products",
      "dedupe_reviews",
      "match_evidence",
      "price_history",
      "product_listings",
      "scrape_runs",
      "sources",
    ]);
  });

  it("has the partial unique index on canonical mpn", async () => {
    const result = await handle.db.execute(
      sql`select indexdef from pg_indexes where indexname = 'canonical_products_mpn_unique'`,
    );
    expect(result.rows).toHaveLength(1);
    expect(String(result.rows[0]!.indexdef)).toContain("WHERE (mpn IS NOT NULL)");
  });
});

describe("seed sources", () => {
  it("seeds the three sources with the documented statuses", async () => {
    const rows = await handle.db.select().from(sources).orderBy(sources.code);
    expect(rows.map((r) => r.code)).toEqual(["cellphones", "gearvn", "phongvu"]);
    const byCode = Object.fromEntries(rows.map((r) => [r.code, r.status]));
    expect(byCode).toEqual({
      cellphones: "investigated",
      gearvn: "approved_for_use",
      phongvu: "blocked",
    });
  });

  it("is idempotent and keeps ids stable", async () => {
    const before = await handle.db.select({ id: sources.id, code: sources.code }).from(sources);
    await seedSources(handle.db);
    const after = await handle.db.select({ id: sources.id, code: sources.code }).from(sources);
    expect(after).toHaveLength(3);
    expect(after).toEqual(before);
  });
});

describe("listing constraints", () => {
  it("rejects a listing pointing at a non-existent source", async () => {
    await expect(
      handle.db.insert(productListings).values({
        sourceId: "00000000-0000-0000-0000-000000000000",
        sourceUrl: "https://example.invalid/p/1",
        title: "Orphan",
        rawPayload: {},
      }),
    ).rejects.toThrow();
  });

  it("enforces one URL per source", async () => {
    const [gearvn] = await handle.db.select().from(sources).where(sql`code = 'gearvn'`);
    const base = {
      sourceId: gearvn!.id,
      sourceUrl: "https://gearvn.com/products/test-duplicate",
      title: "Test",
      rawPayload: { note: "fixture" },
    };
    await handle.db.insert(productListings).values(base);
    await expect(handle.db.insert(productListings).values(base)).rejects.toThrow();
  });

  it("allows many price_history rows for one listing (append-only)", async () => {
    const [listing] = await handle.db.select().from(productListings).limit(1);
    await handle.db.insert(priceHistory).values([
      {
        listingId: listing!.id,
        priceCurrent: "1000000",
        stockStatus: "InStock",
        observedAt: new Date("2026-11-01T00:00:00Z"),
        sourceUrl: listing!.sourceUrl,
      },
      {
        listingId: listing!.id,
        priceCurrent: "900000",
        stockStatus: "InStock",
        observedAt: new Date("2026-11-02T00:00:00Z"),
        sourceUrl: listing!.sourceUrl,
      },
    ]);
    const rows = await handle.db
      .select()
      .from(priceHistory)
      .orderBy(priceHistory.observedAt);
    expect(rows.map((r) => r.priceCurrent)).toEqual(["1000000.00", "900000.00"]);
  });
});
