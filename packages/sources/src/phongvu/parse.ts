import * as cheerio from "cheerio";
import { parseVndPrice } from "@tech-radar/core";
import { ParseError, type ParseContext, type ScrapedListing } from "../types.js";
import {
  absoluteUrl,
  findProductJsonLd,
  nfc,
  nfcTextOf,
  readJsonLd,
  readNextData,
  SCHEMA_AVAILABILITY,
  textOf,
} from "../jsonld.js";

interface NextProduct {
  sku?: unknown;
  name?: unknown;
  imageUrl?: unknown;
  price?: { latestPrice?: unknown; supplierRetailPrice?: unknown };
  stockQuantity?: unknown;
  isPreOrder?: unknown;
  brand?: { name?: unknown };
  link?: { as?: { pathname?: unknown } };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseVndPrice(typeof value === "string" ? value : "");
  return parsed;
}

function stockStatusOf(product: NextProduct): string | null {
  if (product.isPreOrder === true) return "PreOrder";
  const quantity = asNumber(product.stockQuantity);
  if (quantity === null) return null;
  return quantity > 0 ? "InStock" : "OutOfStock";
}

/**
 * Parses a Phong Vũ category page. The page is a Next.js app; the product grid
 * is embedded as JSON in `<script id="__NEXT_DATA__">`, not in the DOM.
 * Only the first page of the category is read (40 products).
 *
 * Colour/switch variants are listed as separate SKUs but share one product URL.
 * The data model keys listings by `(source_id, source_url)`, so a variant group
 * becomes one listing: the cheapest in-stock variant is the representative
 * offer, and every variant payload is kept in `rawPayload`.
 */
export function parsePhongvuCategory(html: string, ctx: ParseContext): ScrapedListing[] {
  const $ = cheerio.load(html);
  const nextData = readNextData($);
  const products = nextData?.props?.pageProps?.serverProducts;
  if (!Array.isArray(products) || products.length === 0) {
    throw new ParseError(`Phong Vu category page has no serverProducts: ${ctx.url}`);
  }

  const groups = new Map<string, NextProduct[]>();
  for (const raw of products as NextProduct[]) {
    const title = textOf(raw.name);
    const path = textOf(raw.link?.as?.pathname);
    if (!title || !path) continue;
    const key = absoluteUrl(path, ctx.url);
    const group = groups.get(key) ?? [];
    group.push(raw);
    groups.set(key, group);
  }

  const listings: ScrapedListing[] = [];
  for (const [sourceUrl, group] of groups) {
    const inStock = group.filter((variant) => stockStatusOf(variant) === "InStock");
    const pool = inStock.length > 0 ? inStock : group;
    const raw = pool.reduce((best, variant) => {
      const bestPrice = asNumber(best.price?.latestPrice) ?? Number.POSITIVE_INFINITY;
      const price = asNumber(variant.price?.latestPrice) ?? Number.POSITIVE_INFINITY;
      return price < bestPrice ? variant : best;
    });

    const title = textOf(raw.name);
    if (!title) continue;
    const latestPrice = asNumber(raw.price?.latestPrice);
    const supplierPrice = asNumber(raw.price?.supplierRetailPrice);

    listings.push({
      sourceCode: "phongvu",
      externalId: textOf(raw.sku),
      sourceUrl,
      title: nfc(title.replace(/\s+/g, " ").trim()),
      brand: nfcTextOf(raw.brand?.name),
      model: null,
      mpn: null,
      sku: textOf(raw.sku),
      priceCurrent: latestPrice !== null && latestPrice > 0 ? latestPrice : null,
      priceOriginal:
        supplierPrice !== null && latestPrice !== null && supplierPrice > latestPrice ? supplierPrice : null,
      currency: "VND",
      stockStatus: stockStatusOf(raw),
      imageUrl: textOf(raw.imageUrl),
      specs: {},
      rawPayload: {
        kind: "category_next_data",
        selectedSku: textOf(raw.sku),
        variants: group,
      },
    });
  }

  if (listings.length === 0) {
    throw new ParseError(`Phong Vu category page produced no usable listings: ${ctx.url}`);
  }
  return listings;
}

/**
 * Parses a Phong Vũ product detail page. The schema.org JSON-LD `Product` node
 * carries identifiers, price and the spec sheet; `mpn` is absent and the list
 * price is not exposed.
 */
export function parsePhongvuProduct(html: string, ctx: ParseContext): ScrapedListing | null {
  const $ = cheerio.load(html);
  const product = findProductJsonLd(readJsonLd($));
  if (!product) return null;

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const availabilityUrl = textOf(offers?.availability);
  const availability = availabilityUrl ? (SCHEMA_AVAILABILITY[availabilityUrl] ?? availabilityUrl) : null;

  const specs: Record<string, string> = {};
  if (Array.isArray(product.additionalProperty)) {
    for (const property of product.additionalProperty) {
      const name = nfcTextOf(property?.name);
      const value = nfcTextOf(property?.value);
      if (name && value) specs[name] = value;
    }
  }

  const imageRaw = Array.isArray(product.image) ? product.image[0] : product.image;
  const title = textOf(product.name);
  if (!title) return null;

  return {
    sourceCode: "phongvu",
    externalId: textOf(product.sku),
    sourceUrl: absoluteUrl(textOf(product.url) ?? ctx.url, ctx.url),
    title: nfc(title.replace(/\s+/g, " ").trim()),
    brand:
      typeof product.brand === "string" ? nfc(product.brand) : nfcTextOf(product.brand?.name),
    model: textOf(product.model),
    mpn: textOf(product.mpn),
    sku: textOf(product.sku),
    priceCurrent: asNumber(offers?.price),
    priceOriginal: null,
    currency: textOf(offers?.priceCurrency) ?? "VND",
    stockStatus: availability,
    imageUrl: textOf(imageRaw) ? absoluteUrl(textOf(imageRaw)!, ctx.url) : null,
    specs,
    rawPayload: { kind: "product_jsonld", product },
  };
}
