# TESTING — Testing strategy

> **Core rule:** tests **must not depend on live websites**. All tests use **saved HTML fixtures** committed to the repo. This keeps tests stable when a site changes or when network/rate limits interfere.

## Layers

| Layer | Scope | Tool | Data |
|---|---|---|---|
| **Unit** | Normalization, price parsing, name normalization, confidence thresholds (pure functions) | vitest | inline |
| **Integration** | Adapter parses HTML fixture → `NormalizedListing`; dedupe engine on labeled fixtures; persistence | vitest | fixture + test DB |
| **Contract** | Adapter output matches schema (zod); API contract | vitest + zod | fixture |
| **E2E** | Worker runs against a local **fixture HTTP server**; UI search/filter/compare | vitest/playwright (optional) | fixture server |
| **Live smoke (optional)** | One real source at small scale, supervised | script | live (manual) |

## Fixtures

- Directory: `tests/fixtures/sources/<source>/`.
- Each fixture ships a **manifest** (`manifest.json`): source URL, `fetched_at`, source, notes, page type (category/product/sitemap).
- **Regenerate fixtures only deliberately**; do not commit content of unknown origin.
- When a site changes markup, add a `v2` fixture and keep `v1` to test reading both (or update the manifest).

## Required tests

1. **Missing data:** fixtures with `null`/missing fields (price, brand, model, SKU) → result must be `null`/`unknown`, **no crash, no inference**.
2. **Format drift:** fixtures with prices in many formats (`12.990.000₫`, `12,990,000`, `12.99tr`), unknown stock labels → parse correctly or `unknown`.
3. **Price history:** `price_history` is written **only when** price/status changes; re-runs create no duplicates; `observed_at` ordering is correct.
4. **Dedupe:** labeled fixtures **correct-match / wrong-match / ambiguous** (see [DEDUPLICATION.md](DEDUPLICATION.md)); assert merge / no-merge / review; merge/split is reversible and audited.
5. **Provenance:** after merge/split, each listing's `raw_payload`, `source_url`, and timestamps are preserved.

## Running tests

- `pnpm test` (unit + integration) — offline.
- `pnpm test:e2e` — if E2E exists; runs against a fixture server.
- **Never rely on live websites for CI stability.**

## Measuring dedupe quality (Phase 4)

- On the labeled fixture set, compute **precision / recall / false-merge rate**.
- Targets: recall ≥ 0.95 for correct-match pairs; false-merge below the agreed threshold; every `ambiguous` case must go to the review queue (never auto-merge).
- Record real results in the run report; never fabricate numbers.
