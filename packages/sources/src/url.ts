/**
 * Canonical form of a store URL, used as the upsert key with `source_id`.
 * Drops the query string, hash, and trailing slash; keeps the path casing.
 */
export function normalizeSourceUrl(input: string): string {
  try {
    const url = new URL(input);
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return input.trim().replace(/\/+$/, "");
  }
}
