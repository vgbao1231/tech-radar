export interface ListingOffer {
  id: string;
  imageUrl: string | null;
  source: string;
  sourceName: string;
  url: string;
  price: number | null;
  priceOriginal: number | null;
  stockStatus: string | null;
  status: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  specs: Record<string, string>;
  imageUrl: string | null;
  listings: ListingOffer[];
  bestPrice: number | null;
}

export interface HistoryPoint {
  price: number | null;
  stockStatus: string | null;
  observedAt: string;
}

export interface ProductDetailListing extends Omit<ListingOffer, "id"> {
  id: string;
  title: string;
  lastSeenAt: string;
  history: HistoryPoint[];
}

export interface ProductDetail {
  product: {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    category: string | null;
    specs: Record<string, string>;
    imageUrl: string | null;
  };
  listings: ProductDetailListing[];
}

export interface SourceInfo {
  id: string;
  code: string;
  name: string;
  baseUrl: string;
  status: "unknown" | "investigated" | "technically_tested" | "approved_for_use" | "blocked";
  termsUrl: string | null;
  robotsUrl: string | null;
  notes: string | null;
  investigatedAt: string | null;
}

export interface ScrapeRunInfo {
  id: string;
  source: string;
  status: string;
  trigger: string;
  startedAt: string | null;
  finishedAt: string | null;
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  errors: Array<{ category?: string; message: string }>;
}

export interface CompareProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  specs: Record<string, string>;
  offers: Array<{
    source: string;
    sourceName: string;
    url: string;
    price: number | null;
    stockStatus: string | null;
  }>;
}

export interface ReviewInfo {
  id: string;
  product_id: string | null;
  listing_ids: string[];
  method: string;
  confidence: string;
  score: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  candidate_name: string | null;
  candidate_brand: string | null;
}

export interface RunTriggerResult {
  runId: string;
  status: string;
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  historyAppended: number;
  errors: Array<{ category?: string; message: string }>;
}
