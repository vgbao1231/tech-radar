import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ParseError } from "./types.js";
import { parsePhongvuCategory, parsePhongvuProduct } from "./phongvu/parse.js";

const fixture = (name: string): string =>
  readFileSync(new URL(`../../../tests/fixtures/sources/phongvu/${name}`, import.meta.url), "utf8");

const categoryUrl = "https://phongvu.vn/c/ban-phim-gaming";

describe("Phong Vu category parser", () => {
  const listings = parsePhongvuCategory(fixture("ban-phim-gaming.html"), { url: categoryUrl });

  it("collapses variants that share a product URL into one listing", () => {
    expect(listings).toHaveLength(35);
    expect(new Set(listings.map((l) => l.sourceUrl)).size).toBe(35);
    for (const listing of listings) {
      expect(listing.sourceCode).toBe("phongvu");
      expect(listing.sourceUrl.startsWith("https://phongvu.vn/")).toBe(true);
      expect(listing.title.length).toBeGreaterThan(5);
      expect(listing.sku).toBeTruthy();
      expect(listing.currency).toBe("VND");
    }
  });

  it("keeps the cheapest in-stock variant as the representative offer", () => {
    const f75 = listings.find((l) => l.sourceUrl.endsWith("/ban-phim-gaming-aula-f75--p886576"));
    expect(f75).toMatchObject({ sku: "260704586", priceCurrent: 729000, priceOriginal: 1290000 });
    const payload = f75!.rawPayload as { selectedSku: string; variants: unknown[] };
    expect(payload.selectedSku).toBe("260704586");
    expect(payload.variants).toHaveLength(3);
  });

  it("parses the AULA S500 card including its list price", () => {
    const s500 = listings.find((l) => l.sku === "261001074");
    expect(s500).toMatchObject({
      sourceCode: "phongvu",
      externalId: "261001074",
      title: "Bàn phím cơ Gaming có dây AULA S500, Red switch (Phiên bản Xám+đen+vàng)",
      brand: "Aula",
      model: null,
      mpn: null,
      priceCurrent: 560000,
      priceOriginal: 899000,
      stockStatus: "InStock",
    });
    expect(s500!.sourceUrl).toBe(
      "https://phongvu.vn/ban-phim-co-gaming-co-day-aula-s500-red-switch-phien-ban-xam-den-vang--s261001074",
    );
    expect(s500!.imageUrl?.startsWith("https://lh3.googleusercontent.com/")).toBe(true);
  });

  it("parses the mouse category with the same data block", () => {
    const mice = parsePhongvuCategory(fixture("chuot-gaming.html"), {
      url: "https://phongvu.vn/c/chuot-gaming",
    });
    expect(mice).toHaveLength(38);
    expect(mice.every((l) => l.priceCurrent !== null)).toBe(true);
    expect(mice.every((l) => l.stockStatus === "InStock")).toBe(true);
  });

  it("throws instead of silently returning nothing", () => {
    expect(() => parsePhongvuCategory("<html><body>blocked</body></html>", { url: categoryUrl })).toThrow(
      ParseError,
    );
  });
});

describe("Phong Vu product parser", () => {
  const product = parsePhongvuProduct(fixture("product-aula-s500.html"), {
    url: "https://phongvu.vn/ban-phim-co-gaming-co-day-aula-s500-red-switch-phien-ban-xam-den-vang--s261001074",
  });

  it("reads identifiers, price and availability from JSON-LD", () => {
    expect(product).toMatchObject({
      sourceCode: "phongvu",
      title: "Bàn phím cơ Gaming có dây AULA S500, Red switch (Phiên bản Xám+đen+vàng)",
      brand: "Aula",
      sku: "261001074",
      mpn: null,
      priceCurrent: 560000,
      priceOriginal: null,
      currency: "VND",
      stockStatus: "InStock",
    });
  });

  it("keeps the spec sheet", () => {
    expect(product!.specs).toMatchObject({
      "Loại bàn phím": "Bàn phím cơ",
      "Kiểu switch": "Red Switch",
      "Tên": "S500",
    });
  });

  it("returns null when the page carries no Product JSON-LD", () => {
    expect(parsePhongvuProduct("<html></html>", { url: categoryUrl })).toBeNull();
  });
});
