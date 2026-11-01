# ADR 0001 — Initial architecture

- **Status:** accepted
- **Date:** 2026-11-01
- **Decided by:** the owner — stack decisions settled.

## Context

Tech Radar is a personal app that aggregates tech gear from multiple Vietnamese online stores. Core requirements: multi-source collection via source adapters, normalization, merging listings into canonical products (keeping each store's price separate), price history, search/compare. The repo is greenfield (git initialized, nothing committed). The machine has Node 26, pnpm 12, Python 3.14 + uv, Go 1.27; no Docker.

Single-user product, clear relational data (canonical/listing/history), needs fuzzy search for dedupe, and a scheduled background worker. No realtime, multi-user, or large horizontal-scale requirements at MVP.

## Decision (settled)

**Modular monolith (no microservices), TypeScript monorepo using pnpm:**

| Component | Decision | Notes |
|---|---|---|
| Monorepo | TypeScript monorepo (pnpm workspaces) | Share types/schema across frontend/backend; no Python backend at MVP |
| Frontend | React + Vite **SPA** | Personal dashboard, private access; **no SSR** at MVP |
| API | Fastify (REST) | |
| Worker | Node worker, **separate process**, always-on environment | **Verify locally first**; VPS not decided yet |
| Database | **PostgreSQL** (target) | Do not install/deploy now; check environment in Phase 2. SQLite only for unit tests/prototype **if truly needed** — do not design two DBs in parallel |
| ORM | **Drizzle** | Direct schema/SQL; fine control over dedupe + price-history queries. Prisma only with a concrete, explained benefit |
| Queue | **Postgres-backed jobs** (pg-boss or a simple jobs table) | No Redis/BullMQ until there is a real need |
| Scraping | `undici`/`fetch` + `cheerio` | Playwright only if a source needs JS rendering (verify Phase 1) |
| Packages | `core` (pure normalize+dedupe), `sources`, `db`, `config`, `shared` | |
| Logging | pino | Observability via `scrape_runs`; no APM |
| Language | UI: **Vietnamese**; field/variable/API/code/schema: **English** | See the doc-language note below |
| Initial categories | **Gaming mice + mechanical keyboards** | Validate model/SKU matching; expand to monitors, headphones, PC parts later |
| Price history | **Never delete at MVP**; append-only by observation time, listing source, actual value | Changes recorded as history rows, never overwriting past history; no cleanup yet |
| Scraping ethics | Respect robots.txt/ToS; no CAPTCHA/login/rate-limit/anti-bot bypass | Per-source approval; never infer permission from robots.txt |

## Alternatives (considered, not chosen)

| Option | Reason rejected |
|---|---|
| Python backend (FastAPI) + JS frontend | Two languages, two build systems; unnecessary at MVP |
| Next.js SSR | No SEO need for a personal dashboard; heavier |
| Prisma | Drizzle is more direct for dedupe/price-history queries; Prisma only with a concrete benefit |
| Redis + BullMQ | Extra infrastructure not yet needed; Postgres-backed is enough for MVP |
| SQLite as primary DB | Weaker full-text/fuzzy support; PostgreSQL is the target |
| Microservices | Operational complexity unnecessary for a single user |

## Consequences

- **Positive:** one language; shared types across domain/API/frontend; Drizzle enables tight dedupe + price-history queries; Postgres supports trigram/fuzzy; Postgres-backed queue needs no extra infrastructure; a separate worker runs reliably in the background.
- **Risks / responsibilities:** must verify PostgreSQL on the machine (Phase 2); the worker needs an always-on host (verify locally first, VPS later); source markup changes → fixture tests; scraping carries legal risk → per-source approval, small low-frequency POC.

## Deferred / open questions (non-blocking)

| Item | Status | Proposed default |
|---|---|---|
| Deployment environment (VPS or other) | Defer to Phase 8 | Verify locally first; VPS decided later |
| Scrape frequency | 6 hours is an **initial proposal**, evaluate after source + ToS verification | Evaluate after Phase 1 |
| Price-history cleanup policy | Defer until volume data exists | No deletion at MVP |
| PostgreSQL on machine | Not verified — check Phase 2 | — |
| MVP private dashboard access | Mechanism not final | Default: simple **single-owner** control (token/basic auth from env); **no** multi-user accounts |
| Technical doc language | Owner-facing Vietnamese / agent-facing English (decided) | See AGENTS.md |

## Notes

- This ADR is owner-approved. Any future architecture change requires a new ADR (supersede).
- Do not install dependencies / change code / deploy a DB **before completing the Phase 1 survey and POC design** (see [docs/PHASE_1_PLAN.md](../PHASE_1_PLAN.md)).
