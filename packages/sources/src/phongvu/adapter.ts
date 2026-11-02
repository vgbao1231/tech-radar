import type { CategoryTarget, SourceAdapter } from "../types.js";
import { parsePhongvuCategory, parsePhongvuProduct } from "./parse.js";

/**
 * Category buckets are shared with GEARVN so listings from both stores can be
 * deduplicated into the same canonical products.
 */
const categories: CategoryTarget[] = [
  {
    path: "/c/ban-phim-gaming",
    category: "mechanical_keyboard",
    label: "Bàn phím gaming",
  },
  {
    path: "/c/chuot-gaming",
    category: "gaming_mouse",
    label: "Chuột gaming",
  },
];

export const phongvuAdapter: SourceAdapter = {
  code: "phongvu",
  displayName: "Phong Vũ",
  baseUrl: "https://phongvu.vn",
  userAgent: "TechRadarBot/0.1 (personal, non-commercial price tracker)",
  minDelayMs: 2000,
  categories,
  parseCategory: parsePhongvuCategory,
  parseProduct: parsePhongvuProduct,
};
