import { normalizeNumericString } from "./money.js";

export interface PriceSnapshot {
  priceCurrent: string | null;
  priceOriginal: string | null;
  stockStatus: string | null;
}

/**
 * Append-only price history rule: a new row is written only when the observed
 * price or stock state differs from the latest stored snapshot.
 */
export function hasPriceChanged(previous: PriceSnapshot | null, next: PriceSnapshot): boolean {
  if (!previous) return true;
  return (
    normalizeNumericString(previous.priceCurrent) !== normalizeNumericString(next.priceCurrent) ||
    normalizeNumericString(previous.priceOriginal) !== normalizeNumericString(next.priceOriginal) ||
    (previous.stockStatus ?? null) !== (next.stockStatus ?? null)
  );
}
