import { describe, expect, it } from "vitest";
import { parseVndPrice, toNumericString } from "./money.js";
import { hasPriceChanged } from "./history.js";
import { normalizeBrand, normalizeText, tokenSimilarity } from "./text.js";
import { compareCandidates, bestCandidate } from "./dedupe.js";

describe("parseVndPrice", () => {
  it.each([
    ["9.590.000đ", 9590000],
    ["1.990.000đ", 1990000],
    ["2,290,000 VND", 2290000],
    ["  1.090.000 đ ", 1090000],
    ["100.000", 100000],
  ])("parses %s", (input, expected) => {
    expect(parseVndPrice(input)).toBe(expected);
  });

  it("returns null for unusable input", () => {
    expect(parseVndPrice(null)).toBeNull();
    expect(parseVndPrice("Liên hệ")).toBeNull();
    expect(parseVndPrice("")).toBeNull();
  });

  it("formats numeric column values", () => {
    expect(toNumericString(9590000)).toBe("9590000.00");
    expect(toNumericString(null)).toBeNull();
  });
});

describe("normalizeText", () => {
  it("strips Vietnamese diacritics and punctuation", () => {
    expect(normalizeText("Bàn phím gaming ASUS ROG Azoth 96 HE White")).toBe(
      "ban phim gaming asus rog azoth 96 he white",
    );
    expect(normalizeText("Điện thoại")).toBe("dien thoai");
  });

  it("normalizes known brands and keeps unknown ones", () => {
    expect(normalizeBrand("asus")).toBe("ASUS");
    expect(normalizeBrand("logitech")).toBe("Logitech");
    expect(normalizeBrand("Thương hiệu lạ")).toBe("Thương hiệu lạ");
    expect(normalizeBrand(null)).toBeNull();
  });

  it("scores token overlap", () => {
    const score = tokenSimilarity("Bàn phím ASUS ROG Azoth 96 HE White", "Bàn phím ASUS ROG Azoth 96 HE Black");
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(1);
    expect(tokenSimilarity("Bàn phím cơ", "Chuột gaming")).toBe(0);
  });
});

describe("hasPriceChanged", () => {
  const snapshot = { priceCurrent: "9590000.00", priceOriginal: null, stockStatus: "InStock" };

  it("is true with no previous snapshot", () => {
    expect(hasPriceChanged(null, snapshot)).toBe(true);
  });

  it("is false for identical values regardless of numeric formatting", () => {
    expect(hasPriceChanged(snapshot, { ...snapshot, priceCurrent: "9590000" })).toBe(false);
  });

  it("is true when price or stock changes", () => {
    expect(hasPriceChanged(snapshot, { ...snapshot, priceCurrent: "8990000.00" })).toBe(true);
    expect(hasPriceChanged(snapshot, { ...snapshot, stockStatus: "OutOfStock" })).toBe(true);
  });
});

describe("compareCandidates", () => {
  const azoth = {
    brand: "ASUS",
    model: "ROG Azoth 96 HE",
    name: "Bàn phím gaming ASUS ROG Azoth 96 HE White",
  };

  it("auto-merges on identical MPN", () => {
    const result = compareCandidates({ ...azoth, mpn: "90MP0x00-BKAA00" }, { ...azoth, mpn: "90mp0x00bkaa00" });
    expect(result).toMatchObject({ method: "mpn_match", decision: "auto_merge", confidence: "high" });
    expect(result.score).toBe(1);
  });

  it("auto-merges on identical SKU", () => {
    const result = compareCandidates({ ...azoth, sku: "KB-ASUS-1" }, { ...azoth, sku: "kb-asus-1" });
    expect(result).toMatchObject({ method: "sku_match", decision: "auto_merge" });
  });

  it("sends brand+model matches to review", () => {
    const result = compareCandidates(azoth, {
      brand: "asus",
      model: "rog azoth 96 he",
      name: "Bàn phím cơ ASUS ROG Azoth 96 HE",
    });
    expect(result).toMatchObject({ method: "brand_model_match", decision: "review" });
    expect(result.score).toBeCloseTo(0.92, 5);
  });

  it("never auto-merges different brands with similar names", () => {
    const result = compareCandidates(azoth, {
      brand: "Logitech",
      name: "Bàn phím gaming Logitech ROG Azoth 96 HE White",
    });
    expect(result.decision).toBe("no_match");
    expect(result.score).toBeLessThanOrEqual(0.4);
  });

  it("picks the best candidate", () => {
    const best = bestCandidate(azoth, [
      { brand: "Logitech", name: "Chuột Logitech G304" },
      { brand: "ASUS", model: "ROG Azoth 96 HE", name: "Bàn phím ASUS ROG Azoth 96 HE" },
    ]);
    expect(best?.candidate.brand).toBe("ASUS");
    expect(best?.verdict.score).toBeCloseTo(0.92, 5);
  });
});
