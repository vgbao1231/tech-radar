import type {
  CompareProduct,
  ProductDetail,
  ProductSummary,
  ScrapeRunInfo,
  SourceInfo,
  ReviewInfo,
  RunTriggerResult,
} from "./types.js";

const TOKEN_KEY = "tech-radar-api-token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (token.trim().length === 0) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token.trim());
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestPost<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  if (!response.ok) {
    throw new ApiError(response.status === 401 ? "Cần token truy cập" : `Lỗi ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

async function request<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(path, { headers });
  if (!response.ok) {
    throw new ApiError(response.status === 401 ? "Cần token truy cập" : `Lỗi ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export const api = {
  products(params: { q?: string; category?: string; limit?: number }): Promise<{ items: ProductSummary[]; total: number }> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return request(`/api/products${suffix}`);
  },
  product(id: string): Promise<ProductDetail> {
    return request(`/api/products/${id}`);
  },
  compare(ids: string[]): Promise<{ products: CompareProduct[]; specKeys: string[] }> {
    return request(`/api/compare?ids=${ids.join(",")}`);
  },
  sources(): Promise<{ items: SourceInfo[] }> {
    return request("/api/sources");
  },
  triggerRun(source: string): Promise<RunTriggerResult | { items: RunTriggerResult[] }> {
    return requestPost("/api/runs/trigger", { source });
  },
  runs(params?: { q?: string; source?: string; limit?: number }): Promise<{ items: ScrapeRunInfo[] }> {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.source) query.set("source", params.source);
    if (params?.limit) query.set("limit", String(params.limit));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return request(`/api/runs${suffix}`);
  },
  reviews(status?: string): Promise<{ items: ReviewInfo[] }> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/reviews${suffix}`);
  },
  decideReview(id: string, decision: "accept" | "reject"): Promise<{ ok: boolean; id: string; decision: string }> {
    return requestPost(`/api/reviews/${id}/decision`, { decision });
  },
};
