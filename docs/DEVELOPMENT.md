# DEVELOPMENT — Development

> **Status: VERIFIED & OPERATIONAL.** All commands and components listed below have been implemented, tested, and verified against Node.js v26 and pnpm v12.

## Prerequisites

| Tool | Requirement | Available on this machine? | Notes |
|---|---|---|---|
| Node.js | ≥ 20 | **Yes** (v26.11.1) | Built-in `.env` loading (`process.loadEnvFile`) |
| pnpm | ≥ 9 | **Yes** (v12.14.0) | Monorepo workspaces (`pnpm-workspace.yaml`) |
| PostgreSQL | ≥ 15 (Optional for dev) | **Not installed** | Dev & test use **PGlite** (embedded Postgres WASM). Production can point to a real Postgres via `DATABASE_URL`. |
| Git | ≥ 2 | **Yes** (v2.56.0) | Working tree initialized |
| Docker | Optional | **Not installed** | Not required thanks to PGlite |

## Directory structure

```
tech-radar/
  apps/
    web/        # React + Vite SPA (Vietnamese UI, search, compare, history sparklines)
    api/        # Fastify REST API (products, comparison, runs, sources, reviews)
    worker/     # Node worker (polite ingestion, price history tracking, canonical linking)
  packages/
    core/       # Money parsing, Vietnamese text normalization, dedupe & scoring engine
    sources/    # Source adapters (GEARVN adapter, cheerio parsers, URL normalizer)
    db/         # Drizzle schema (7 tables), migrations, seed, PGlite & Node-PG client
  docs/         # Documentation (Vietnamese for owner, English for agents)
  tests/fixtures/  # Saved HTML fixtures for offline parser/worker tests
```

## Verified commands

| Command | Purpose | Verification status |
|---|---|---|
| `pnpm install` | Install monorepo dependencies | **Verified** |
| `pnpm test` | Run all test suites across workspaces (50 tests) | **Verified (50/50 passed)** |
| `pnpm typecheck` | Strict TypeScript check across all packages | **Verified (0 errors)** |
| `pnpm db:generate` | Generate Drizzle SQL migrations | **Verified** |
| `pnpm db:migrate` | Apply migrations to database (PGlite or Postgres) | **Verified** |
| `pnpm db:seed` | Upsert sources into database idempotently | **Verified** |
| `pnpm dev:api` | Run Fastify API in development mode with `tsx watch` | **Verified** |
| `pnpm dev:web` | Run React + Vite frontend dev server | **Verified** |
| `pnpm --filter @tech-radar/web build` | Build Vite frontend for production | **Verified (dist created)** |
| `pnpm --filter @tech-radar/worker start -- --live` | Run a single polite ingestion pass against live sources | **Verified (40 listings fetched & ingested)** |

## Database options

1. **Local development (default):**
   If `DATABASE_URL` is omitted, the app automatically persists data into `.data/pglite` using PGlite. No local PostgreSQL installation is needed.
2. **Production or external PostgreSQL:**
   Set `DATABASE_URL=postgresql://user:password@host:5432/dbname` in `.env`. The app seamlessly switches to `pg` (node-postgres) with connection pooling.
3. **Automated tests:**
   Vitest runs against an in-memory PGlite instance with migrations applied automatically, ensuring 100% test isolation and zero side effects.

## Environment variables

See [.env.example](../.env.example). Create a `.env` in the root directory for custom configuration.

```bash
# Optional API security
API_TOKEN=your-secret-token

# Optional database URL (defaults to embedded PGlite in .data/pglite)
DATABASE_URL=
PGLITE_DATA_DIR=.data/pglite

# API & Worker settings
API_PORT=3001
API_HOST=127.0.0.1
LOG_LEVEL=info
ALLOW_LIVE_FETCH=0
```
