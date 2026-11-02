import type * as cheerio from "cheerio";

/** Shared helpers for adapters whose pages expose schema.org JSON-LD blocks. */

export const SCHEMA_AVAILABILITY: Record<string, string> = {
  "https://schema.org/InStock": "InStock",
  "http://schema.org/InStock": "InStock",
  "https://schema.org/OutOfStock": "OutOfStock",
  "http://schema.org/OutOfStock": "OutOfStock",
  "https://schema.org/PreOrder": "PreOrder",
  "http://schema.org/PreOrder": "PreOrder",
  "https://schema.org/SoldOut": "SoldOut",
  "http://schema.org/SoldOut": "SoldOut",
  "https://schema.org/Discontinued": "Discontinued",
  "http://schema.org/Discontinued": "Discontinued",
};

export function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export function textOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

/** Stores normalize to NFC; Phong Vũ ships some spec strings decomposed (NFD). */
export function nfc(value: string): string {
  return value.normalize("NFC");
}

/** `textOf` plus NFC normalization. */
export function nfcTextOf(value: unknown): string | null {
  const text = textOf(value);
  return text ? nfc(text) : null;
}

export function readJsonLd($: cheerio.CheerioAPI): unknown[] {
  const blocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // A malformed block must not abort parsing of the rest of the page.
    }
  });
  return blocks;
}

export function findProductJsonLd(blocks: unknown[]): Record<string, any> | null {
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const candidate = block as Record<string, any>;
    const type = candidate["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
      return candidate;
    }
  }
  return null;
}

/** Reads the embedded Next.js page data (`<script id="__NEXT_DATA__">`). */
export function readNextData($: cheerio.CheerioAPI): Record<string, any> | null {
  const raw = $('script[id="__NEXT_DATA__"]').first().contents().text();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : null;
  } catch {
    return null;
  }
}
