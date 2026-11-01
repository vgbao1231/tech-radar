/**
 * Contract every store adapter implements. Parsers are pure functions over
 * already-fetched HTML so they can be tested against saved fixtures without
 * touching the network.
 */
export interface ScrapedListing {
  sourceCode: string;
  externalId: string | null;
  sourceUrl: string;
  title: string;
  brand: string | null;
  model: string | null;
  mpn: string | null;
  sku: string | null;
  priceCurrent: number | null;
  priceOriginal: number | null;
  currency: string;
  stockStatus: string | null;
  specs: Record<string, string>;
  /** Raw structured data kept for provenance (JSON-LD payload, card text, ...). */
  rawPayload: unknown;
}

export interface CategoryTarget {
  /** URL path on the store, e.g. `/collections/ban-phim-co`. */
  path: string;
  /** Internal category identifier stored on canonical products. */
  category: "mechanical_keyboard" | "gaming_mouse";
  label: string;
}

export interface ParseContext {
  /** Absolute URL of the fetched document (for resolving links). */
  url: string;
}

export interface SourceAdapter {
  code: string;
  displayName: string;
  baseUrl: string;
  /** Descriptive bot UA; never a browser impersonation. */
  userAgent: string;
  /** Minimum delay between requests to this source. */
  minDelayMs: number;
  categories: CategoryTarget[];
  parseCategory(html: string, ctx: ParseContext): ScrapedListing[];
  parseProduct(html: string, ctx: ParseContext): ScrapedListing | null;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
