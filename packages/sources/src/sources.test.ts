import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ParseError } from "./types.js";
import { normalizeSourceUrl } from "./url.js";
import { parseGearvnCategory, parseGearvnProduct } from "./gearvn/parse.js";

const fixture = (name: string): string =>
  readFileSync(new URL(`../../../tests/fixtures/sources/gearvn/${name}`, import.meta.url), "utf8");

const categoryUrl = "https://gearvn.com/collections/ban-phim-co";

describe("GEARVN category parser", () => {
  const listings = parseGearvnCategory(fixture("ban-phim-co.html"), { url: categoryUrl });

  it("extracts every product card on the page", () => {
    expect(listings.length).toBeGreaterThanOrEqual(20);
    for (const listing of listings) {
      expect(listing.sourceUrl.startsWith("https://gearvn.com/products/")).toBe(true);
      expect(listing.title.length).toBeGreaterThan(5);
      expect(listing.priceCurrent).toBeGreaterThan(0);
    }
  });

  it("parses the ROG Azoth card", () => {
    const azoth = listings.find((l) => l.sourceUrl.endsWith("/ban-phim-gaming-asus-rog-azoth-96-he-white"));
    expect(azoth).toMatchObject({
      sourceCode: "gearvn",
      priceCurrent: 9590000,
      priceOriginal: null,
      currency: "VND",
      brand: null,
      sku: null,
    });
    expect(azoth!.title).toBe("Bàn phím gaming ASUS ROG Azoth 96 HE White");
    expect(azoth!.specs.highlights).toContain("96%");
  });

  it("parses discounted cards with an original price", () => {
    const g316 = listings.find((l) => l.sourceUrl.includes("logitech-g316-x-98-rgb-trang-tactile"));
    expect(g316?.priceCurrent).toBe(1990000);
    expect(g316?.priceOriginal).toBe(2290000);
  });

  it("parses the mouse category with the same card structure", () => {
    const mice = parseGearvnCategory(fixture("gaming-mouse.html"), {
      url: "https://gearvn.com/collections/gaming-mouse",
    });
    expect(mice.length).toBeGreaterThanOrEqual(20);
    expect(mice.every((l) => l.sourceUrl.includes("/products/"))).toBe(true);
  });

  it("throws instead of silently returning nothing", () => {
    expect(() => parseGearvnCategory("<html><body>blocked</body></html>", { url: categoryUrl })).toThrow(
      ParseError,
    );
  });
});

describe("GEARVN product parser", () => {
  const product = parseGearvnProduct(fixture("product-azoth-96-he-white.html"), {
    url: "https://gearvn.com/products/ban-phim-gaming-asus-rog-azoth-96-he-white",
  });

  it("reads identifiers, price and availability from JSON-LD", () => {
    expect(product).toMatchObject({
      sourceCode: "gearvn",
      title: "Bàn phím gaming ASUS ROG Azoth 96 HE White",
      brand: "ASUS",
      sku: "KB-ASUS-M902-ROG-AZOTH-96-HE-WHI",
      mpn: null,
      priceCurrent: 9590000,
      priceOriginal: null,
      currency: "VND",
      stockStatus: "InStock",
    });
  });

  it("keeps the spec sheet", () => {
    expect(product!.specs).toMatchObject({
      "Kích thước/Layout": "96%",
      "Chất liệu vỏ": "Kim loại",
      "Đèn LED": "RGB",
    });
  });

  it("returns null when the page carries no Product JSON-LD", () => {
    expect(parseGearvnProduct("<html></html>", { url: categoryUrl })).toBeNull();
  });
});

describe("normalizeSourceUrl", () => {
  it("drops query strings, hashes and trailing slashes", () => {
    expect(normalizeSourceUrl("https://gearvn.com/products/x/?utm=1#top")).toBe("https://gearvn.com/products/x");
    expect(normalizeSourceUrl("https://gearvn.com/products/x")).toBe("https://gearvn.com/products/x");
  });
});
