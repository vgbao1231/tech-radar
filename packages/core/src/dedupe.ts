import { normalizeBrand, normalizeText, tokenSimilarity } from "./text.js";

export type MatchMethod =
  | "mpn_match"
  | "sku_match"
  | "brand_model_match"
  | "name_similarity"
  | "spec_match"
  | "manual";

export type Confidence = "high" | "medium" | "low";
export type MatchDecision = "auto_merge" | "review" | "no_match";

export interface MatchInput {
  brand?: string | null;
  model?: string | null;
  mpn?: string | null;
  sku?: string | null;
  name: string;
}

export interface MatchVerdict {
  score: number;
  method: MatchMethod;
  confidence: Confidence;
  decision: MatchDecision;
  reasons: string[];
}

/** Auto-merge needs an unambiguous identifier match (per docs/DEDUPLICATION.md). */
export const AUTO_MERGE_THRESHOLD = 0.95;
export const REVIEW_THRESHOLD = 0.6;

function keyOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return key.length === 0 ? null : key;
}

function confidenceFor(score: number): Confidence {
  if (score >= AUTO_MERGE_THRESHOLD) return "high";
  if (score >= REVIEW_THRESHOLD) return "medium";
  return "low";
}

function decide(score: number): MatchDecision {
  if (score >= AUTO_MERGE_THRESHOLD) return "auto_merge";
  if (score >= REVIEW_THRESHOLD) return "review";
  return "no_match";
}

function verdict(
  score: number,
  method: MatchMethod,
  reasons: string[],
  confidence = confidenceFor(score),
): MatchVerdict {
  return { score, method, confidence, decision: decide(score), reasons };
}

/**
 * Compares two listings/canonicals. Deterministic and explainable: the first
 * identifier match wins, otherwise a name-similarity score is returned.
 *
 * This is a scoring primitive — it never mutates data. Merging is a separate,
 * audited action (Phase 4).
 */
export function compareCandidates(a: MatchInput, b: MatchInput): MatchVerdict {
  const reasons: string[] = [];

  const mpnA = keyOf(a.mpn);
  const mpnB = keyOf(b.mpn);
  if (mpnA && mpnB && mpnA === mpnB) {
    reasons.push(`mpn: ${mpnA}`);
    return verdict(1, "mpn_match", reasons, "high");
  }

  const skuA = keyOf(a.sku);
  const skuB = keyOf(b.sku);
  if (skuA && skuB && skuA === skuB) {
    reasons.push(`sku: ${skuA}`);
    return verdict(0.97, "sku_match", reasons, "high");
  }

  const brandA = normalizeBrand(a.brand);
  const brandB = normalizeBrand(b.brand);
  const modelA = a.model ? normalizeText(a.model) : null;
  const modelB = b.model ? normalizeText(b.model) : null;
  const sameBrand = Boolean(brandA && brandB && normalizeText(brandA) === normalizeText(brandB));
  const sameModel = Boolean(modelA && modelB && modelA === modelB);

  const nameScore = tokenSimilarity(a.name, b.name);

  if (sameBrand && sameModel) {
    reasons.push(`brand=${brandA}`, `model=${modelA}`);
    // Same brand/model still goes to review: variants can share a model name.
    return verdict(0.92, "brand_model_match", reasons, "high");
  }

  if (brandA && brandB && !sameBrand) {
    reasons.push(`brand mismatch: ${brandA} vs ${brandB}`);
    return verdict(Math.min(nameScore * 0.4, 0.4), "name_similarity", reasons, "low");
  }

  reasons.push(`name similarity ${nameScore.toFixed(3)}`);
  if (sameBrand) reasons.push(`brand=${brandA}`);
  return verdict(Number(nameScore.toFixed(4)), "name_similarity", reasons);
}

/** Picks the best candidate for `target`; ties resolve to the first entry. */
export function bestCandidate<T extends MatchInput>(
  target: MatchInput,
  candidates: T[],
): { candidate: T; verdict: MatchVerdict } | null {
  let best: { candidate: T; verdict: MatchVerdict } | null = null;
  for (const candidate of candidates) {
    const verdict = compareCandidates(target, candidate);
    if (!best || verdict.score > best.verdict.score) {
      best = { candidate, verdict };
    }
  }
  return best;
}
