import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const sourceStatusEnum = pgEnum("source_status", [
  "unknown",
  "investigated",
  "technically_tested",
  "approved_for_use",
  "blocked",
]);

export const canonicalStatusEnum = pgEnum("canonical_status", [
  "active",
  "needs_review",
  "merged",
  "archived",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "out_of_stock",
  "discontinued",
  "pending_review",
  "archived",
]);

export const reviewMethodEnum = pgEnum("review_method", [
  "mpn_match",
  "sku_match",
  "brand_model_match",
  "name_similarity",
  "spec_match",
  "manual",
]);

export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "accepted",
  "rejected",
  "merged",
  "split",
]);

export const runTriggerEnum = pgEnum("run_trigger", ["cron", "manual", "backfill"]);

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "success",
  "partial",
  "failed",
]);

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  status: sourceStatusEnum("status").notNull().default("unknown"),
  termsUrl: text("terms_url"),
  robotsUrl: text("robots_url"),
  notes: text("notes"),
  investigatedAt: timestamp("investigated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canonicalProducts = pgTable(
  "canonical_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brand: text("brand"),
    model: text("model"),
    mpn: text("mpn"),
    sku: text("sku"),
    name: text("name").notNull(),
    category: text("category"),
    specs: jsonb("specs").notNull().default(sql`'{}'::jsonb`),
    status: canonicalStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Safety net only: MPN is the most reliable key when present.
    uniqueIndex("canonical_products_mpn_unique")
      .on(t.mpn)
      .where(sql`${t.mpn} IS NOT NULL`),
    index("canonical_products_brand_model_idx").on(t.brand, t.model),
    index("canonical_products_name_idx").on(t.name),
  ],
);

export const productListings = pgTable(
  "product_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => canonicalProducts.id, {
      onDelete: "set null",
    }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    externalId: text("external_id"),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    brand: text("brand"),
    model: text("model"),
    mpn: text("mpn"),
    sku: text("sku"),
    priceCurrent: numeric("price_current", { precision: 12, scale: 2 }),
    priceOriginal: numeric("price_original", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("VND"),
    stockStatus: text("stock_status"),
    specs: jsonb("specs").notNull().default(sql`'{}'::jsonb`),
    rawPayload: jsonb("raw_payload").notNull(),
    status: listingStatusEnum("status").notNull().default("active"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("product_listings_source_url_unique").on(t.sourceId, t.sourceUrl),
    index("product_listings_product_idx").on(t.productId),
    index("product_listings_source_idx").on(t.sourceId),
  ],
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => productListings.id, { onDelete: "restrict" }),
    priceCurrent: numeric("price_current", { precision: 12, scale: 2 }),
    priceOriginal: numeric("price_original", { precision: 12, scale: 2 }),
    stockStatus: text("stock_status"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("price_history_listing_observed_idx").on(t.listingId, t.observedAt.desc())],
);

export const dedupeReviews = pgTable(
  "dedupe_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => canonicalProducts.id, {
      onDelete: "set null",
    }),
    listingIds: uuid("listing_ids").array().notNull(),
    method: reviewMethodEnum("method").notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    score: numeric("score", { precision: 5, scale: 4 }),
    reason: text("reason"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("dedupe_reviews_status_idx").on(t.status)],
);

export const matchEvidence = pgTable(
  "match_evidence",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => canonicalProducts.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => productListings.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    value: text("value"),
    method: text("method").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("match_evidence_product_idx").on(t.productId)],
);

export const scrapeRuns = pgTable(
  "scrape_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    trigger: runTriggerEnum("trigger").notNull(),
    status: runStatusEnum("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    listingsFound: integer("listings_found").notNull().default(0),
    listingsNew: integer("listings_new").notNull().default(0),
    listingsUpdated: integer("listings_updated").notNull().default(0),
    errors: jsonb("errors").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scrape_runs_source_created_idx").on(t.sourceId, t.createdAt.desc())],
);

/* ------------------------------------------------------------------ */
/* Relations (typed query helpers; FKs above are the source of truth)   */
/* ------------------------------------------------------------------ */

export const sourcesRelations = relations(sources, ({ many }) => ({
  listings: many(productListings),
  runs: many(scrapeRuns),
}));

export const canonicalProductsRelations = relations(canonicalProducts, ({ many }) => ({
  listings: many(productListings),
  evidence: many(matchEvidence),
}));

export const productListingsRelations = relations(productListings, ({ one, many }) => ({
  source: one(sources, {
    fields: [productListings.sourceId],
    references: [sources.id],
  }),
  product: one(canonicalProducts, {
    fields: [productListings.productId],
    references: [canonicalProducts.id],
  }),
  history: many(priceHistory),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  listing: one(productListings, {
    fields: [priceHistory.listingId],
    references: [productListings.id],
  }),
}));

export const scrapeRunsRelations = relations(scrapeRuns, ({ one }) => ({
  source: one(sources, { fields: [scrapeRuns.sourceId], references: [sources.id] }),
}));

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type CanonicalProduct = typeof canonicalProducts.$inferSelect;
export type NewCanonicalProduct = typeof canonicalProducts.$inferInsert;
export type ProductListing = typeof productListings.$inferSelect;
export type NewProductListing = typeof productListings.$inferInsert;
export type PriceHistoryRow = typeof priceHistory.$inferSelect;
export type NewPriceHistoryRow = typeof priceHistory.$inferInsert;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type NewScrapeRun = typeof scrapeRuns.$inferInsert;
