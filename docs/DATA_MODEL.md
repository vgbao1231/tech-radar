# DATA_MODEL — Data model

> This is a **proposed design**. The real schema is implemented in Phase 2 with the settled ORM. Types: UUID; timestamps `timestamptz`; money uses `numeric` (VND amounts can be large; avoid float).

## Principles

- **Immutable provenance:** every collected record keeps `source`, `source_url`, `raw_payload`, and timestamps. Never delete raw data.
- **Missing field = `null`**, no inference (never fill guessed values).
- **Never mix prices:** each store's price lives on its **Product Listing**, independently.
- **Do not hard-constrain fuzzy uniqueness:** dedupe is managed by the **engine** (application layer), not by a rigid DB constraint, so two canonicals can stay separate while uncertain.

## Entities

### `sources`

Data source (store).

| Field | Type | Constraint | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `code` | text | UNIQUE | `gearvn`, `phongvu`, `cellphones` |
| `name` | text | NOT NULL | Display name |
| `base_url` | text | NOT NULL | Source homepage |
| `status` | enum | NOT NULL, default `unknown` | `unknown` / `investigated` / `technically_tested` / `approved_for_use` / `blocked` |
| `terms_url` | text | NULL | Terms-of-service URL (if found) |
| `robots_url` | text | NULL | robots.txt URL |
| `notes` | text | NULL | Notes, blockers |
| `investigated_at` | timestamptz | NULL | Date checked |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `canonical_products`

Canonical product/model.

| Field | Type | Constraint | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `brand` | text | NULL | Normalized display |
| `model` | text | NULL | Normalized model |
| `mpn` | text | NULL | MPN (Manufacturer Part Number) |
| `sku` | text | NULL | Normalized SKU |
| `name` | text | NOT NULL | Canonical display name (from most trusted listing) |
| `category` | text | NULL | Category |
| `specs` | jsonb | default `{}` | Aggregated specs |
| `status` | enum | default `active` | `active` / `needs_review` / `merged` / `archived` |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

**Proposed index (safety net, not a hard constraint):** partial unique index on `mpn` when `mpn IS NOT NULL` (MPN is the most reliable key). Do not enforce unique on `(brand, model)` because same-name models with different specs can exist.

### `product_listings`

A single store's product record (one listing).

| Field | Type | Constraint | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `product_id` | uuid | FK → canonical_products, **NULL** | NULL = not linked to a canonical yet (pending review) |
| `source_id` | uuid | FK → sources, NOT NULL | |
| `external_id` | text | NULL | Store-side product ID |
| `source_url` | text | NOT NULL | Listing URL |
| `title` | text | NOT NULL | Raw listing title (from store) |
| `brand` | text | NULL | Raw |
| `model` | text | NULL | Raw |
| `mpn` | text | NULL | Raw |
| `sku` | text | NULL | Raw |
| `price_current` | numeric(12,2) | NULL | Current price (VND) |
| `price_original` | numeric(12,2) | NULL | Original/list price if present |
| `currency` | text | default `VND` | |
| `stock_status` | text | NULL | Raw stock label |
| `specs` | jsonb | default `{}` | Specs (raw or extracted) |
| `raw_payload` | jsonb | NOT NULL | Full fetched raw data (provenance) |
| `status` | enum | default `active` | `active` / `out_of_stock` / `discontinued` / `pending_review` / `archived` |
| `first_seen_at` | timestamptz | NOT NULL | |
| `last_seen_at` | timestamptz | NOT NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

**Uniqueness:** `(source_id, source_url)` UNIQUE — one listing = one URL on one source. `(source_id, external_id)` can repeat (variants), so it is not a key.

### `price_history`

Price history — **append-only**, **never deleted at MVP**. Insert a new row only when price/status changes versus the listing's latest row (price changes are recorded as history rows, **never overwriting** past history). Each row stores the observation time, listing source, and actual value.

| Field | Type | Constraint | Notes |
|---|---|---|---|
| `id` | bigserial | PK | |
| `listing_id` | uuid | FK → product_listings, NOT NULL | |
| `price_current` | numeric(12,2) | NULL | |
| `price_original` | numeric(12,2) | NULL | |
| `stock_status` | text | NULL | |
| `observed_at` | timestamptz | NOT NULL | Observation time |
| `source_url` | text | NULL | URL snapshot (provenance) |
| `created_at` | timestamptz | NOT NULL | |

**Index:** `(listing_id, observed_at DESC)` for the history chart.

### `dedupe_reviews`

Review queue / match decisions pending action.

| Field | Type | Constraint | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `product_id` | uuid | FK → canonical_products, NULL | Candidate if any |
| `listing_ids` | uuid[] | NOT NULL | Listings under consideration |
| `method` | enum | NOT NULL | `mpn_match` / `brand_model_match` / `name_similarity` / `spec_match` / `manual` |
| `confidence` | enum | NOT NULL | `high` / `medium` / `low` |
| `score` | numeric(5,4) | NULL | Score 0..1 |
| `reason` | text | NULL | Match explanation |
| `status` | enum | default `pending` | `pending` / `accepted` / `rejected` / `merged` / `split` |
| `decided_by` | text | NULL | `system` / `user` |
| `decided_at` | timestamptz | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `match_evidence`

Match trace (audit) — records each matched feature on merge/split.

| Field | Type | Constraint |
|---|---|---|
| `id` | bigserial | PK |
| `product_id` | uuid | FK → canonical_products |
| `listing_id` | uuid | FK → product_listings |
| `feature` | text | NOT NULL (`brand`, `model`, `mpn`, `name_sim`, `spec`) |
| `value` | text | NULL |
| `method` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL |

### `scrape_runs`

Result of each ingestion cycle (observability).

| Field | Type | Constraint |
|---|---|---|
| `id` | uuid | PK |
| `source_id` | uuid | FK → sources |
| `trigger` | enum | `cron` / `manual` / `backfill` |
| `status` | enum | `queued` / `running` / `success` / `partial` / `failed` |
| `started_at` / `finished_at` | timestamptz | NULL |
| `listings_found` / `listings_new` / `listings_updated` | int | default 0 |
| `errors` | jsonb | default `[]` |
| `created_at` | timestamptz | NOT NULL |

## Relationships

- `sources 1 ─ N product_listings` (one source has many listings).
- `canonical_products 1 ─ N product_listings` (one canonical groups listings from many sources). `product_listings.product_id` is NULL while pending review.
- `product_listings 1 ─ N price_history`.
- `canonical_products 1 ─ N match_evidence`; `product_listings 1 ─ N match_evidence`.
- `sources 1 ─ N scrape_runs`.
- `dedupe_reviews` references `product_id` + a list of `listing_ids`.

## Provenance

Every external record (listing) stores: `source_id`, `source_url`, `raw_payload`, `first_seen_at`, `last_seen_at`. Never overwrite `raw_payload` with inferred data. On merge/split, each listing's provenance is preserved.

## Technical notes

- VND money uses `numeric` to avoid float error.
- `specs` uses JSONB for category flexibility; per-category schemas can be zod-validated at the application layer (not required in DB yet).
- Timestamps use `timestamptz` (UTC), rendered in the user's timezone.
