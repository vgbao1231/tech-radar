import { gearvnAdapter } from "./gearvn/index.js";
import type { SourceAdapter } from "./types.js";
import { normalizeSourceUrl } from "./url.js";

export * from "./types.js";
export { gearvnAdapter, parseGearvnCategory, parseGearvnProduct } from "./gearvn/index.js";
export { normalizeSourceUrl } from "./url.js";

/**
 * Registry of implemented adapters. A source only appears here after it passed
 * the feasibility review in docs/SOURCES.md.
 */
export const adapters: Record<string, SourceAdapter> = {
  [gearvnAdapter.code]: gearvnAdapter,
};

export function getAdapter(code: string): SourceAdapter {
  const adapter = adapters[code];
  if (!adapter) throw new Error(`Unknown source adapter: ${code}`);
  return adapter;
}
