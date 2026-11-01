# DEDUPLICATION — Merging listings into canonical products

> **Proposed design.** The real logic lives in `packages/core` (Phase 4). Goal: merge the same model correctly, never merge wrongly, never lose provenance, and keep merge/split reversible.

## Principles

- **Never merge on name similarity alone.** Names are a weak signal and prone to false merges.
- **Prefer strong identifiers:** `brand + MPN/SKU`, then `brand + model`, then name similarity + specs.
- **Confidence tier** decides the action. When uncertain → **do not auto-merge**, send to the review queue.
- **Prices stay independent per store:** merging never consolidates prices; every listing keeps its own.
- **Never lose data:** keep originals; only link/unlink; record audit.

## 1. Normalization

| Field | Rule | Keep raw? |
|---|---|---|
| Title | lowercase, NFC, strip diacritics, collapse whitespace, drop noise words (`chính hãng`, `hàng chính hãng`, `fullbox`, `new`, `100%`) | Yes (raw title) |
| Brand | lowercase, strip diacritics, alias map (`nvidia`/`asus rog`/`rog`) | Yes |
| Model | lowercase, strip diacritics, drop variant suffix if separable (RAM, capacity) | Yes |
| MPN | uppercase, strip spaces/hyphens | Yes |
| SKU | uppercase, strip spaces | Yes |
| Price | parse `12.990.000₫`, `12,990,000`, `12.99tr`, `12,99 triệu` → numeric VND | — |
| Stock status | map known labels → `in_stock` / `out_of_stock` / `preorder` / `unknown`; unknown label → `unknown` | Yes (raw label) |

> Normalization is **only for matching**. Display still uses the raw value from the listing.

## 2. Matching features — highest priority first

| # | Feature | Condition | Tier |
|---|---|---|---|
| 1 | **MPN/SKU** | normalized MPN/SKU exact match + brand matches | HIGH |
| 2 | **Brand + Model** | normalized model exact match, model is meaningful (not a generic token) | HIGH |
| 3 | **Name similarity** | brand matches + token-set/trigram similarity ≥ threshold | MEDIUM |
| 4 | **Specs** | substantial spec overlap (RAM, storage, CPU, screen) — used as a **tiebreaker** | raises tier |
| 5 | Name only, no brand | high similarity but brand mismatch | LOW → review |

## 3. Confidence tiers

| Tier | Score (0..1) | Action |
|---|---|---|
| **HIGH** | ≥ 0.85 | Auto-merge + write `match_evidence`; still reversible (split). |
| **MEDIUM** | 0.60 – 0.85 | **Suggest merge** but enqueue for review; do not auto-merge by default (safe). |
| **LOW** | < 0.60 | Do not merge; create a separate canonical or keep pending review. |

> **Safe default:** only **HIGH** auto-merges. **MEDIUM/LOW** go to `dedupe_reviews` for the owner. The owner may opt into auto-merging MEDIUM if desired (configurable).

## 4. False-positive strategy

- Never auto-merge on **name similarity alone** below HIGH.
- **Require brand match** for any HIGH decision (except when MPN matches exactly and one side lacks brand → still HIGH with a note).
- **Same model, different specs** (different RAM/capacity) → **do NOT merge**; split canonical or send to review. This is the most common mistake (e.g., 16GB vs 32GB laptop).
- **Huge price gap** between similarly named listings → flag for review (could be a different SKU/condition). Price is **not** a primary merge signal.
- Every merge/split is audited (`match_evidence` + `dedupe_reviews`) so it can be traced back.

## 5. Review queue & manual actions

- Review queue = `dedupe_reviews` rows with status `pending`, with evidence (matched features, score, related listings).
- Actions: **accept merge** / **reject** / **split** / **edit canonical** / **link-unlink listing**.
- Owner decisions record `decided_by='user'` and are reversible.

## 6. Merge / Split

**Merge:**
- Set `listing.product_id` → canonical.
- Canonical absorbs the best fields (brand/model/mpn from the most trusted listing).
- Write `match_evidence` for each listing; never delete listings, never change `raw_payload`.
- Each listing's price/history stays intact.

**Split (reverse merge):**
- Unlink a listing from the canonical; optionally create a new canonical from the listing's own data.
- `price_history` stays with the listing — nothing lost.
- Audit the `split`.

## 7. Test cases (labeled fixtures)

The fixture set contains listing pairs/sets labeled **correct-match** (should merge) / **wrong-match** (must not merge) / **ambiguous** (must go to review). Examples:

| Label | Case | Expectation |
|---|---|---|
| match | "Asus ROG Strix G16 2024 i7-13650HX/16GB/512GB" (GEARVN) vs same model (Phong Vũ), same MPN | HIGH, merge |
| match | Same brand+model, slightly different name, same specs | HIGH/MEDIUM |
| no-match | Same model but different RAM (16GB vs 32GB) | do not merge / review |
| no-match | Similar name but different brand | do not merge / review |
| ambiguous | Different names, no MPN, incomplete specs | review queue |

When adding a new test case, update this table and the corresponding fixture.
