/**
 * VND money helpers.
 *
 * Stored amounts are integers in VND (the currency has no subunit in practice),
 * while the database column is `numeric(12,2)` (string in JS). Helpers here keep
 * the conversion in one place and never use floating point for parsing.
 */

/** Parses Vietnamese price text such as "9.590.000đ" or "1,990,000 VND". */
export function parseVndPrice(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input
    .replace(/[^\d.,-]/g, "")
    .replace(/[.,](?=\d{3}\b)/g, "") // thousands separators
    .replace(/,/g, ".");
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

/** Decimal string for `numeric(12,2)` columns. */
export function toNumericString(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined) return null;
  return amount.toFixed(2);
}

/** Canonical form used to decide whether a price really changed. */
export function normalizeNumericString(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed.toFixed(2);
}
