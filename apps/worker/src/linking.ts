import { eq } from "drizzle-orm";
import {
  canonicalProducts,
  dedupeReviews,
  matchEvidence,
  productListings,
  type Db,
} from "@tech-radar/db";
import { bestCandidate, compareCandidates, normalizeBrand, type MatchVerdict } from "@tech-radar/core";
import type { ScrapedListing } from "@tech-radar/sources";

export interface CanonicalCandidate {
  id: string;
  brand: string | null;
  model: string | null;
  mpn: string | null;
  sku: string | null;
  name: string;
}

export async function loadCandidates(db: Db, category: string | null): Promise<CanonicalCandidate[]> {
  const rows = await db
    .select({
      id: canonicalProducts.id,
      brand: canonicalProducts.brand,
      model: canonicalProducts.model,
      mpn: canonicalProducts.mpn,
      sku: canonicalProducts.sku,
      name: canonicalProducts.name,
      category: canonicalProducts.category,
    })
    .from(canonicalProducts)
    .where(eq(canonicalProducts.status, "active"));

  return rows
    .filter((row) => category === null || row.category === null || row.category === category)
    .map(({ category: _category, ...candidate }) => candidate);
}

async function recordEvidence(db: Db, productId: string, listingId: string, verdict: MatchVerdict): Promise<void> {
  const rows = [
    { productId, listingId, feature: "method", value: verdict.method, method: verdict.method },
    ...verdict.reasons.map((reason) => {
      const [feature, ...rest] = reason.split(":");
      return {
        productId,
        listingId,
        feature: feature!.trim(),
        value: rest.join(":").trim() || null,
        method: verdict.method,
      };
    }),
  ];
  await db.insert(matchEvidence).values(rows);
}

export interface LinkResult {
  action: "attached" | "created" | "review" | "skipped";
  productId: string | null;
  verdict?: MatchVerdict;
}

/**
 * Links a stored listing to a canonical product.
 *
 * - identifier match (mpn/sku) → attach automatically, evidence recorded
 * - close-but-uncertain match → listing gets its own canonical + a pending
 *   dedupe review, because a wrong merge is worse than a duplicate
 * - no candidates → new canonical
 *
 * Never merges two canonicals here; that is a separate audited action.
 */
export async function linkListing(
  db: Db,
  listing: {
    id: string;
    productId: string | null;
    title: string;
    brand: string | null;
    model: string | null;
    mpn: string | null;
    sku: string | null;
    specs: Record<string, string>;
  },
  category: string | null,
  candidates: CanonicalCandidate[],
): Promise<LinkResult> {
  if (listing.productId) return { action: "skipped", productId: listing.productId };

  const best = bestCandidate(
    {
      brand: listing.brand,
      model: listing.model,
      mpn: listing.mpn,
      sku: listing.sku,
      name: listing.title,
    },
    candidates,
  );

  if (best && best.verdict.decision === "auto_merge") {
    await db.update(productListings).set({ productId: best.candidate.id }).where(eq(productListings.id, listing.id));
    await recordEvidence(db, best.candidate.id, listing.id, best.verdict);
    return { action: "attached", productId: best.candidate.id, verdict: best.verdict };
  }

  const [created] = await db
    .insert(canonicalProducts)
    .values({
      brand: normalizeBrand(listing.brand),
      model: listing.model,
      mpn: listing.mpn,
      sku: listing.sku,
      name: listing.title,
      category,
      specs: listing.specs,
      status: "active",
    })
    .returning({ id: canonicalProducts.id });
  const productId = created!.id;
  await db.update(productListings).set({ productId }).where(eq(productListings.id, listing.id));
  candidates.push({
    id: productId,
    brand: normalizeBrand(listing.brand),
    model: listing.model,
    mpn: listing.mpn,
    sku: listing.sku,
    name: listing.title,
  });

  if (best && best.verdict.decision === "review") {
    await db.insert(dedupeReviews).values({
      productId: best.candidate.id,
      listingIds: [listing.id],
      method: best.verdict.method,
      confidence: best.verdict.confidence,
      score: best.verdict.score.toFixed(4),
      reason: best.verdict.reasons.join("; "),
      status: "pending",
    });
    return { action: "review", productId, verdict: best.verdict };
  }

  return { action: "created", productId };
}

export { compareCandidates };
