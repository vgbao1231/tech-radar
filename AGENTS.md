# AGENTS.md — Instructions for coding agents

Stable guidance for every coding agent working in this repo. **Read before modifying any file.**

## Document language policy

- **Owner-facing docs are written in Vietnamese** (the owner reads them): `README.md`, `docs/PRODUCT.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/SOURCES.md`, `docs/PHASE_1_PLAN.md`.
- **Agent-facing docs are written in English** (agents/devs read them): `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DEDUPLICATION.md`, `docs/TESTING.md`, `docs/DEVELOPMENT.md`, `docs/adr/*`.
- **Code convention:** UI copy is Vietnamese; field names, variables, API paths/fields, schema, and code identifiers are English.
- Do not translate a doc across this boundary without the owner's approval.

## Mandatory rules

1. **Read docs before coding.** Start from [README.md](README.md) and [docs/](docs/README.md). At minimum read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_MODEL.md](docs/DATA_MODEL.md), [docs/DEDUPLICATION.md](docs/DEDUPLICATION.md), and [docs/ROADMAP.md](docs/ROADMAP.md) before touching domain/ingestion logic.
2. **Check actual scripts.** Never assume a command exists. Read the real `package.json`/config before running `pnpm test`, `pnpm build`, etc. If a command is missing, say so instead of fabricating a result.
3. **Minimal diffs.** Change only what the task needs; no drive-by refactors, no unnecessary renames, no extra files.
4. **Run relevant tests.** Run unit tests for the touched module; run integration tests if the pipeline is affected. Tests must use **saved fixtures**, never live websites.
5. **Never fabricate results.** Do not report "passed", "works", or "verified" without actually running it. Distinguish *fact* (ran/saw it), *assumption*, and *proposal*.
6. **Do not change the stack unilaterally.** Any architecture/stack/ORM/queue change requires an ADR and owner approval. Do not add dependencies without a stated reason and approval.
7. **Stay in scope.** Follow the current phase in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/STATUS.md](docs/STATUS.md). Do not expand into AI, alerts, multi-user, blog, or manual catalog.
8. **Respect data sources.** Never bypass CAPTCHA, login, paywall, rate limits, or anti-bot measures. If a source is blocked/unsuitable, record the blocker in [docs/SOURCES.md](docs/SOURCES.md) and **continue with architecture that does not depend on that source** — do not change the product goal.
9. **Provenance is immutable.** Never delete/lose raw data (`raw_payload`, `source_url`, timestamps). Merge/split must be audited and reversible.
10. **Update docs alongside code.** When code changes behavior/endpoints/schema, update the relevant docs in the same change.

## Repo scope

- This is a personal, **single-user** project (owner). Do not design multi-user auth.
- Default architecture: **modular monolith** (ADR 0001 — accepted). Do not create microservices without a new approved ADR.
- **Settled stack:** TypeScript monorepo (pnpm), React+Vite SPA, Fastify, Node worker (separate process), PostgreSQL + Drizzle, Postgres-backed queue. See [docs/adr/0001-initial-architecture.md](docs/adr/0001-initial-architecture.md).
- **Language:** UI in Vietnamese; field/variable/API/code/schema identifiers in English.
- **Initial categories:** gaming mice + mechanical keyboards; expand only after the pipeline is stable.
- **Scraping ethics:** no CAPTCHA/login/rate-limit/anti-bot bypass; per-source approval; never infer permission from robots.txt.

## Current status (summary)

- **Phases 0–6:** done (ADR 0001 accepted, Postgres schema + migrations 0000–0002, GEARVN + Phong Vũ adapters, worker pipeline, API, SPA).
- **Phase 7:** in progress — Phong Vũ adapter implemented and tested offline; no live Phong Vũ run yet; CellphoneS still blocked on ToS review.
- Full details in [docs/STATUS.md](docs/STATUS.md) and [docs/ROADMAP.md](docs/ROADMAP.md) (do not duplicate the roadmap here).
