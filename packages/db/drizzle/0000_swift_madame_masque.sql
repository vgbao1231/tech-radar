CREATE TYPE "public"."canonical_status" AS ENUM('active', 'needs_review', 'merged', 'archived');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'out_of_stock', 'discontinued', 'pending_review', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_method" AS ENUM('mpn_match', 'brand_model_match', 'name_similarity', 'spec_match', 'manual');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'accepted', 'rejected', 'merged', 'split');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."run_trigger" AS ENUM('cron', 'manual', 'backfill');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('unknown', 'investigated', 'technically_tested', 'approved_for_use', 'blocked');--> statement-breakpoint
CREATE TABLE "canonical_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text,
	"model" text,
	"mpn" text,
	"sku" text,
	"name" text NOT NULL,
	"category" text,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "canonical_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dedupe_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"listing_ids" uuid[] NOT NULL,
	"method" "review_method" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"score" numeric(5, 4),
	"reason" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"value" text,
	"method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"price_current" numeric(12, 2),
	"price_original" numeric(12, 2),
	"stock_status" text,
	"observed_at" timestamp with time zone NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"source_id" uuid NOT NULL,
	"external_id" text,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"brand" text,
	"model" text,
	"mpn" text,
	"sku" text,
	"price_current" numeric(12, 2),
	"price_original" numeric(12, 2),
	"currency" text DEFAULT 'VND' NOT NULL,
	"stock_status" text,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"trigger" "run_trigger" NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"listings_found" integer DEFAULT 0 NOT NULL,
	"listings_new" integer DEFAULT 0 NOT NULL,
	"listings_updated" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"status" "source_status" DEFAULT 'unknown' NOT NULL,
	"terms_url" text,
	"robots_url" text,
	"notes" text,
	"investigated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "dedupe_reviews" ADD CONSTRAINT "dedupe_reviews_product_id_canonical_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."canonical_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_evidence" ADD CONSTRAINT "match_evidence_product_id_canonical_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."canonical_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_evidence" ADD CONSTRAINT "match_evidence_listing_id_product_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."product_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_listing_id_product_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."product_listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_product_id_canonical_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."canonical_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_products_mpn_unique" ON "canonical_products" USING btree ("mpn") WHERE "canonical_products"."mpn" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "canonical_products_brand_model_idx" ON "canonical_products" USING btree ("brand","model");--> statement-breakpoint
CREATE INDEX "canonical_products_name_idx" ON "canonical_products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "dedupe_reviews_status_idx" ON "dedupe_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "match_evidence_product_idx" ON "match_evidence" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_history_listing_observed_idx" ON "price_history" USING btree ("listing_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "product_listings_source_url_unique" ON "product_listings" USING btree ("source_id","source_url");--> statement-breakpoint
CREATE INDEX "product_listings_product_idx" ON "product_listings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_listings_source_idx" ON "product_listings" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "scrape_runs_source_created_idx" ON "scrape_runs" USING btree ("source_id","created_at" DESC NULLS LAST);