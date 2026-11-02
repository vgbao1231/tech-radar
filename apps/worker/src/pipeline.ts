import { and, desc, eq } from "drizzle-orm";
import {
  priceHistory,
  productListings,
  type Db,
  type NewProductListing,
} from "@tech-radar/db";
import { hasPriceChanged, toNumericString, type PriceSnapshot } from "@tech-radar/core";
import { normalizeSourceUrl, type ScrapedListing } from "@tech-radar/sources";
import { linkListing, loadCandidates } from "./linking.js";

export interface IngestResult {
  inserted: number;
  updated: number;
  historyAppended: number;
  linked: { attached: number; created: number; review: number; skipped: number };
}

export interface IngestOptions {
  /** Internal category for canonicals created from this batch. */
  category?: string | null;
}

function listingStatusFor(stockStatus: string | null): NewProductListing["status"] {
  if (stockStatus === "InStock") return "active";
  if (stockStatus === "Discontinued") return "discontinued";
  if (stockStatus === "OutOfStock" || stockStatus === "SoldOut") return "out_of_stock";
  return "active";
}

function toRow(sourceId: string, listing: ScrapedListing, observedAt: Date): NewProductListing {
  return {
    sourceId,
    externalId: listing.externalId,
    sourceUrl: normalizeSourceUrl(listing.sourceUrl),
    title: listing.title,
    brand: listing.brand,
    model: listing.model,
    mpn: listing.mpn,
    sku: listing.sku,
    priceCurrent: toNumericString(listing.priceCurrent),
    priceOriginal: toNumericString(listing.priceOriginal),
    currency: listing.currency,
    stockStatus: listing.stockStatus,
    specs: listing.specs,
    imageUrl: listing.imageUrl,
    rawPayload: { parsed: listing.rawPayload, fetchedAt: observedAt.toISOString() },
    status: listingStatusFor(listing.stockStatus),
    firstSeenAt: observedAt,
    lastSeenAt: observedAt,
    updatedAt: observedAt,
  };
}

async function latestSnapshot(db: Db, listingId: string): Promise<PriceSnapshot | null> {
  const [row] = await db
    .select({
      priceCurrent: priceHistory.priceCurrent,
      priceOriginal: priceHistory.priceOriginal,
      stockStatus: priceHistory.stockStatus,
    })
    .from(priceHistory)
    .where(eq(priceHistory.listingId, listingId))
    .orderBy(desc(priceHistory.observedAt), desc(priceHistory.id))
    .limit(1);
  return row ?? null;
}

/**
 * Persists one scrape batch. Idempotent by `(source_id, source_url)`:
 * re-running the same payload updates `last_seen_at` without duplicating rows,
 * and appends price history only when price/stock actually changed.
 */
export async function ingestListings(
  db: Db,
  sourceId: string,
  listings: ScrapedListing[],
  observedAt: Date,
  options: IngestOptions = {},
): Promise<IngestResult> {
  let inserted = 0;
  let updated = 0;
  let historyAppended = 0;
  const linked = { attached: 0, created: 0, review: 0, skipped: 0 };
  const category = options.category ?? null;
  const candidates = await loadCandidates(db, category);

  for (const listing of listings) {
    const row = toRow(sourceId, listing, observedAt);

    const [existing] = await db
      .select({ id: productListings.id, productId: productListings.productId })
      .from(productListings)
      .where(and(eq(productListings.sourceId, sourceId), eq(productListings.sourceUrl, row.sourceUrl)))
      .limit(1);

    if (!existing) {
      const [created] = await db.insert(productListings).values(row).returning({ id: productListings.id });
      await db.insert(priceHistory).values({
        listingId: created!.id,
        priceCurrent: row.priceCurrent,
        priceOriginal: row.priceOriginal,
        stockStatus: row.stockStatus,
        observedAt,
        sourceUrl: row.sourceUrl,
      });
      const link = await linkListing(
        db,
        {
          id: created!.id,
          productId: null,
          title: row.title,
          brand: row.brand ?? null,
          model: row.model ?? null,
          mpn: row.mpn ?? null,
          sku: row.sku ?? null,
          specs: listing.specs,
          imageUrl: listing.imageUrl,
        },
        category,
        candidates,
      );
      linked[link.action] += 1;
      inserted += 1;
      historyAppended += 1;
      continue;
    }

    const previous = await latestSnapshot(db, existing.id);
    const next: PriceSnapshot = {
      priceCurrent: row.priceCurrent ?? null,
      priceOriginal: row.priceOriginal ?? null,
      stockStatus: row.stockStatus ?? null,
    };

    await db
      .update(productListings)
      .set({
        title: row.title,
        brand: row.brand,
        model: row.model,
        mpn: row.mpn,
        sku: row.sku,
        externalId: row.externalId,
        priceCurrent: row.priceCurrent,
        priceOriginal: row.priceOriginal,
        stockStatus: row.stockStatus,
        specs: row.specs,
        imageUrl: row.imageUrl,
        rawPayload: row.rawPayload,
        status: row.status,
        lastSeenAt: observedAt,
        updatedAt: observedAt,
      })
      .where(eq(productListings.id, existing.id));

    if (hasPriceChanged(previous, next)) {
      await db.insert(priceHistory).values({
        listingId: existing.id,
        priceCurrent: next.priceCurrent,
        priceOriginal: next.priceOriginal,
        stockStatus: next.stockStatus,
        observedAt,
        sourceUrl: row.sourceUrl,
      });
      historyAppended += 1;
    }
    const link = await linkListing(
      db,
      {
        id: existing.id,
        productId: existing.productId,
        title: row.title,
        brand: row.brand ?? null,
        model: row.model ?? null,
        mpn: row.mpn ?? null,
        sku: row.sku ?? null,
        specs: listing.specs,
        imageUrl: listing.imageUrl,
      },
      category,
      candidates,
    );
    linked[link.action] += 1;
    updated += 1;
  }

  return { inserted, updated, historyAppended, linked };
}
