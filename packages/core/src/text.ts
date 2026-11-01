/**
 * Vietnamese-aware text normalization used for matching and display cleanup.
 * Matching works on diacritic-stripped lowercase tokens; display strings keep
 * their original form.
 */

const BRAND_ALIASES: Record<string, string> = {
  asus: "ASUS",
  acer: "Acer",
  akko: "AKKO",
  apple: "Apple",
  corsair: "Corsair",
  dell: "Dell",
  edra: "Edra",
  gigabyte: "Gigabyte",
  glorious: "Glorious",
  hp: "HP",
  hyperx: "HyperX",
  keychron: "Keychron",
  lenovo: "Lenovo",
  leopold: "Leopold",
  logitech: "Logitech",
  madlions: "Madlions",
  msi: "MSI",
  newmen: "Newmen",
  predator: "Predator",
  rapoo: "Rapoo",
  razer: "Razer",
  royalkludge: "ROYAL KLUDGE",
  steelseries: "SteelSeries",
  akko_rs: "AKKO",
};

/** Lowercase, strip Vietnamese diacritics, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Token set for similarity scoring. */
export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/** Normalized brand display name, or null when nothing usable remains. */
export function normalizeBrand(input: string | null | undefined): string | null {
  if (!input) return null;
  const key = normalizeText(input).replace(/\s+/g, "");
  if (key.length === 0) return null;
  return BRAND_ALIASES[key] ?? input.trim();
}

/** Jaccard similarity of token sets, 0..1. */
export function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  return intersection / (setA.size + setB.size - intersection);
}

/** Removes store-specific marketing noise from a listing title for display. */
export function cleanTitle(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
