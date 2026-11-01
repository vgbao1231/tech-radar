import * as cheerio from "cheerio";
import { parseVndPrice } from "@tech-radar/core";
import { ParseError, type ParseContext, type ScrapedListing } from "../types.js";

const AVAILABILITY: Record<string, string> = {
  "https://schema.org/InStock": "InStock",
  "http://schema.org/InStock": "InStock",
  "https://schema.org/OutOfStock": "OutOfStock",
  "http://schema.org/OutOfStock": "OutOfStock",
  "https://schema.org/PreOrder": "PreOrder",
  "https://schema.org/SoldOut": "SoldOut",
  "https://schema.org/Discontinued": "Discontinued",
};

function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function textOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function readJsonLd($: cheerio.CheerioAPI): unknown[] {
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

function findProductJsonLd(blocks: unknown[]): Record<string, any> | null {
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

/**
 * Parses a GEARVN category listing page (server-rendered product cards).
 * Only fields present in the markup are filled; everything else stays null.
 */
export function parseGearvnCategory(html: string, ctx: ParseContext): ScrapedListing[] {
  const $ = cheerio.load(html);
  const cards = $("a.product-card");
  if (cards.length === 0) {
    throw new ParseError(`GEARVN category page has no product cards: ${ctx.url}`);
  }

  const listings: ScrapedListing[] = [];
  cards.each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).find(".product-card-name").first().text().replace(/\s+/g, " ").trim();
    if (!href || !title) return;

    const saleText = $(el).find(".product-card-price-sale").first().text();
    const originalText = $(el).find(".product-card-price-original").first().text();
    const specs = $(el)
      .find(".product-card-spec")
      .map((__, spec) => $(spec).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((value) => value.length > 0);

    listings.push({
      sourceCode: "gearvn",
      externalId: null,
      sourceUrl: absoluteUrl(href, ctx.url),
      title,
      brand: null,
      model: null,
      mpn: null,
      sku: null,
      priceCurrent: parseVndPrice(saleText),
      priceOriginal: parseVndPrice(originalText),
      currency: "VND",
      stockStatus: null,
      specs: specs.length > 0 ? { highlights: specs.join(" | ") } : {},
      rawPayload: {
        kind: "category_card",
        href,
        priceSaleText: saleText.trim() || null,
        priceOriginalText: originalText.trim() || null,
        highlightSpecs: specs,
      },
    });
  });

  if (listings.length === 0) {
    throw new ParseError(`GEARVN category page produced no usable listings: ${ctx.url}`);
  }
  return listings;
}

/**
 * Parses a GEARVN product detail page. The JSON-LD `Product` node carries the
 * identifier fields (sku/brand/price/availability/specs); `mpn` is absent.
 */
export function parseGearvnProduct(html: string, ctx: ParseContext): ScrapedListing | null {
  const $ = cheerio.load(html);
  const product = findProductJsonLd(readJsonLd($));
  if (!product) return null;

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const availabilityUrl = textOf(offers?.availability);
  const availability = availabilityUrl ? (AVAILABILITY[availabilityUrl] ?? availabilityUrl) : null;

  const specs: Record<string, string> = {};
  if (Array.isArray(product.additionalProperty)) {
    for (const property of product.additionalProperty) {
      const name = textOf(property?.name);
      const value = textOf(property?.value);
      if (name && value) specs[name] = value;
    }
  }

  const brand =
    typeof product.brand === "string" ? product.brand : textOf(product.brand?.name) ?? null;
  const price = typeof offers?.price === "number" ? offers.price : parseVndPrice(textOf(offers?.price));
  const currency = textOf(offers?.priceCurrency) ?? "VND";

  const title = textOf(product.name);
  if (!title) return null;

  return {
    sourceCode: "gearvn",
    externalId: textOf(product.productID) ?? null,
    sourceUrl: absoluteUrl(textOf(product.url) ?? ctx.url, ctx.url),
    title: title.replace(/\s+/g, " ").trim(),
    brand,
    model: textOf(product.model) ?? null,
    mpn: textOf(product.mpn) ?? null,
    sku: textOf(product.sku) ?? null,
    priceCurrent: price,
    // GEARVN product JSON-LD does not expose the list price.
    priceOriginal: null,
    currency,
    stockStatus: availability,
    specs,
    rawPayload: { kind: "product_jsonld", product },
  };
}
