# ARCHITECTURE — Architecture (settled)

> **Status: ACCEPTED** (owner-approved, 2026-11-01). The authoritative decision record is [adr/0001-initial-architecture.md](adr/0001-initial-architecture.md). Applies from Phase 2; Phase 1 is source survey / POC design (see [PHASE_1_PLAN.md](PHASE_1_PLAN.md)).

## Principles

- **Modular monolith, no microservices.** Personal, single-user app; splitting into microservices only adds operational complexity without benefit.
- **One language** for frontend, API, and worker → shared types across domain/API/frontend, less context switching.
- **Clear module boundaries** so the worker/API can be split later without a rewrite.
- **Respect data sources:** no CAPTCHA/login/rate-limit/anti-bot bypass; each source must be verified independently.

## Stack (settled)

| Component | Decision | Notes |
|---|---|---|
| Language | TypeScript (Node ≥ 20) | Machine has Node 26.11.1, pnpm 12.14.0 |
| Package manager | pnpm workspaces (monorepo) | Shared types/schema across frontend/backend |
| Frontend | React + Vite (SPA) | Personal dashboard, private access; no SSR at MVP |
| API | Fastify | Lightweight, type-safe, Node-friendly |
| Worker | Node worker (separate process) | Verify locally first; always-on environment |
| Database | PostgreSQL (target) | Check machine in Phase 2; SQLite only for unit tests/prototype if needed |
| ORM | Drizzle ORM | Fine control over dedupe + price-history queries; Prisma only with a concrete benefit |
| Queue | Postgres-backed jobs | Avoid Redis/BullMQ at MVP |
| Scraping | `undici`/`fetch` + `cheerio` | Playwright only if a source needs JS rendering (verify Phase 1) |
| Validation | zod | Schema for normalized data |
| Logging | pino | Structured logs; observability via `scrape_runs` |
| Test | vitest | Unit + integration; saved fixtures |

**Strengths:** one language end to end; strong scraping (cheerio) and type-safety ecosystem; Postgres covers dedupe (trigram) and price history; no Docker/Redis needed for the MVP (Docker is not installed on this machine).

**Weaknesses / trade-offs:** monorepo needs build tooling; Postgres is a hard dependency (not yet verified on machine — check Phase 2); the worker needs an always-on host (VPS or dedicated machine); scraping carries legal risk, so each source must be approved separately.

## Component diagram

```
                       ┌──────────────────────────────────────────┐
                       │                 DB (PostgreSQL)          │
                       │  sources · canonical_products · listings │
                       │  price_history · dedupe_reviews · runs   │
                       └──────▲───────────────▲────────────▲──────┘
                              │               │            │
        ┌──────────────┐   ┌──┴───────┐   ┌───┴──────┐  ┌───┴────────┐
        │   Web UI      │   │   API     │   │  Worker   │  │  Queue     │
        │ React+Vite    │──▶│  Fastify  │   │ (ingestion│  │ (jobs,     │
        │ search/compare│   │  REST     │   │  worker)  │  │  DB-backed)│
        └──────────────┘   └────┬──────┘   └────┬──────┘  └────▲────────┘
                               │                │              │
                     ┌─────────▼────────┐  ┌────▼──────────────┴──────┐
                     │   packages/core   │  │   packages/sources        │
                     │  normalize·dedupe │  │  SourceAdapter interface  │
                     │  (pure, no I/O)   │  │  gearvn · phongvu · ...   │
                     └───────────────────┘  └───────────────────────────┘
```

## Data flow (ingestion cycle)

1. **Scheduler** (cron) creates a job for source `S`.
2. **Worker** picks up the job, enumerates URLs to fetch (category/sitemap) politely, with delays between requests.
3. **Source adapter** fetches → parses → list of raw listings.
4. **Normalize** (core) → `NormalizedListing` (zod-validated; missing fields = `null`, no inference).
5. **Dedupe** (core) → match against existing canonicals/listings → assign `product_id` or enqueue for review.
6. **Persist:** upsert listing by `(source, url)`; append `price_history` **only when** price/status changes; update canonical; record run result.
7. Update listing status (active / out_of_stock / discontinued).

## Module boundaries

- **`packages/sources`** — knows only source-specific markup. **No** DB access; returns plain `NormalizedListing`. Must not import `worker`/`api`.
- **`packages/core`** — pure logic (normalize, dedupe, confidence). No I/O, no source knowledge.
- **`packages/db`** — schema, migrations, repositories. No business logic.
- **`apps/api`** — HTTP only; calls core + db repos.
- **`apps/worker`** — ingestion orchestration; calls sources + core + db.
- **Dependency direction:** `api`, `worker` → `core`, `db`, `sources`; `sources` → `core` (types). **No cycles.**

## Failure handling & durability

- **Per-URL:** catch per-URL errors → log + count → **continue** (run result = `partial`).
- **Retry:** exponential backoff for transient errors (network, 5xx, 429); respect `Retry-After`; never hammer.
- **Degraded source:** repeated consecutive failures → mark the source degraded temporarily; never silently drop data.
- **Idempotent:** upsert by `(source, url)`; re-runs do not create duplicates.
- **Transactions:** persist in batches; roll back mid-batch failures to avoid partial state.
- **Never delete data:** only change status (`archived`, `merged`); provenance is preserved.

## Settled decisions & deferred items

**Settled (ADR 0001):** TypeScript monorepo, React+Vite SPA, Fastify, Node worker (separate process), PostgreSQL + Drizzle, Postgres-backed queue, Vietnamese UI + English identifiers, initial categories = gaming mice + mechanical keyboards, price history not deleted at MVP.

**Deferred / to confirm** (non-blocking):

1. **Worker deployment environment:** verify locally first; VPS decided in Phase 8.
2. **Scrape frequency:** 6 hours is an initial proposal; evaluate after source + ToS verification.
3. **Price-history cleanup policy:** defer until volume data exists.
4. **PostgreSQL on machine:** check in Phase 2.
5. **MVP private dashboard access:** default simple single-owner control (token/basic auth from env); **no** multi-user accounts.
6. **Technical doc language:** owner-facing Vietnamese / agent-facing English (decided); see AGENTS.md.

## Risks & verification

| Risk | Mitigation | Verification |
|---|---|---|
| Source markup changes frequently | Isolated adapters; fixture tests; schema validation | Contract tests on fixtures |
| Anti-bot / rate limit / ToS | Polite, respect robots, no bypass; per-source approval | Phase 1 feasibility, record blockers |
| Bad dedupe | Confidence tiers + review queue; reversible merge/split | Labeled correct/incorrect fixtures |
| Scrape volume > politeness budget | Incremental runs, only changed pages; throttling | Phase 3/6 |
| Legal (robots ≠ license) | Never treat robots as legal permission; review ToS separately | Phase 1, document per source |
