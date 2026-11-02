import { eq } from "drizzle-orm";
import { scrapeRuns, sources, type Db } from "@tech-radar/db";
import type { ScrapedListing, SourceAdapter } from "@tech-radar/sources";
import type { Logger } from "pino";
import { PoliteFetcher } from "./fetch.js";
import { ingestListings } from "./pipeline.js";

export interface RunSourceOptions {
  db: Db;
  adapter: SourceAdapter;
  /** Limit to these category paths (defaults to all adapter categories). */
  categoryPaths?: string[];
  /** Fetch product detail pages to enrich identifiers/specs. Opt-in: it multiplies requests. */
  enrichDetails?: boolean;
  /** Cap on detail fetches per category; protects against runaway runs. */
  maxDetailFetches?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  logger?: Logger;
}

export interface RunSourceResult {
  runId: string;
  status: "success" | "partial" | "failed";
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  historyAppended: number;
  linked: { attached: number; created: number; review: number; skipped: number };
  errors: Array<{ category?: string; message: string }>;
}

function mergeListing(base: ScrapedListing, detail: ScrapedListing): ScrapedListing {
  return {
    ...base,
    title: detail.title || base.title,
    brand: detail.brand ?? base.brand,
    model: detail.model ?? base.model,
    mpn: detail.mpn ?? base.mpn,
    sku: detail.sku ?? base.sku,
    priceCurrent: detail.priceCurrent ?? base.priceCurrent,
    priceOriginal: base.priceOriginal ?? detail.priceOriginal,
    stockStatus: detail.stockStatus ?? base.stockStatus,
    specs: { ...base.specs, ...detail.specs },
    imageUrl: detail.imageUrl ?? base.imageUrl,
    rawPayload: { category: base.rawPayload, product: detail.rawPayload },
  };
}

export async function runSource(options: RunSourceOptions): Promise<RunSourceResult> {
  const { db, adapter } = options;
  const now = options.now ?? (() => new Date());
  const startedAt = now();

  const [source] = await db.select().from(sources).where(eq(sources.code, adapter.code)).limit(1);
  if (!source) {
    throw new Error(`Source "${adapter.code}" is not seeded; run db:seed first`);
  }

  const [run] = await db
    .insert(scrapeRuns)
    .values({ sourceId: source.id, trigger: "manual", status: "running", startedAt })
    .returning({ id: scrapeRuns.id });
  const runId = run!.id;

  const fetcher = new PoliteFetcher({
    userAgent: adapter.userAgent,
    minDelayMs: adapter.minDelayMs,
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
  });

  const categories = adapter.categories.filter(
    (category) => !options.categoryPaths || options.categoryPaths.includes(category.path),
  );

  const errors: Array<{ category?: string; message: string }> = [];
  let listingsFound = 0;
  let listingsNew = 0;
  let listingsUpdated = 0;
  let historyAppended = 0;
  const linked = { attached: 0, created: 0, review: 0, skipped: 0 };

  for (const category of categories) {
    try {
      const pageUrl = new URL(category.path, adapter.baseUrl).toString();
      const page = await fetcher.get(pageUrl);
      const parsed = adapter.parseCategory(page.body, { url: page.url });

      let listings = parsed;
      if (options.enrichDetails) {
        const limit = Math.min(options.maxDetailFetches ?? parsed.length, parsed.length);
        const enriched: ScrapedListing[] = [];
        for (const [index, listing] of parsed.entries()) {
          if (index >= limit) {
            enriched.push(listing);
            continue;
          }
          try {
            const detailPage = await fetcher.get(listing.sourceUrl);
            const detail = adapter.parseProduct(detailPage.body, { url: detailPage.url });
            enriched.push(detail ? mergeListing(listing, detail) : listing);
          } catch (error) {
            errors.push({ category: category.path, message: `${listing.sourceUrl}: ${(error as Error).message}` });
            enriched.push(listing);
          }
        }
        listings = enriched;
      }

    const result = await ingestListings(db, source.id, listings, now(), { category: category.category });
      listingsFound += listings.length;
      listingsNew += result.inserted;
      listingsUpdated += result.updated;
      historyAppended += result.historyAppended;
      linked.attached += result.linked.attached;
      linked.created += result.linked.created;
      linked.review += result.linked.review;
      linked.skipped += result.linked.skipped;
      options.logger?.info(
        { category: category.path, found: listings.length, ...result },
        "category ingested",
      );
    } catch (error) {
      errors.push({ category: category.path, message: (error as Error).message });
      options.logger?.error({ category: category.path, err: error }, "category failed");
    }
  }

  const status: RunSourceResult["status"] =
    errors.length === 0 ? (categories.length === 0 ? "failed" : "success") : listingsFound > 0 ? "partial" : "failed";

  await db
    .update(scrapeRuns)
    .set({
      status,
      finishedAt: now(),
      listingsFound,
      listingsNew,
      listingsUpdated,
      errors,
    })
    .where(eq(scrapeRuns.id, runId));

  return { runId, status, listingsFound, listingsNew, listingsUpdated, historyAppended, linked, errors };
}
