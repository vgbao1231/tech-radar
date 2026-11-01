import type { CategoryTarget, SourceAdapter } from "../types.js";
import { parseGearvnCategory, parseGearvnProduct } from "./parse.js";

const categories: CategoryTarget[] = [
  {
    path: "/collections/ban-phim-co",
    category: "mechanical_keyboard",
    label: "Bàn phím cơ",
  },
  {
    path: "/collections/gaming-mouse",
    category: "gaming_mouse",
    label: "Chuột gaming",
  },
];

export const gearvnAdapter: SourceAdapter = {
  code: "gearvn",
  displayName: "GEARVN",
  baseUrl: "https://gearvn.com",
  userAgent: "TechRadarBot/0.1 (personal, non-commercial price tracker)",
  minDelayMs: 2000,
  categories,
  parseCategory: parseGearvnCategory,
  parseProduct: parseGearvnProduct,
};
