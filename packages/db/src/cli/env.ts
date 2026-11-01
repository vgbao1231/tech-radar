import { existsSync } from "node:fs";

/** Loads `.env` from the repo root when present (Node >= 20.12). */
export function loadEnv(): void {
  const path = new URL("../../../../.env", import.meta.url).pathname;
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}
