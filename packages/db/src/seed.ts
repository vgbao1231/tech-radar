import { sql } from "drizzle-orm";
import type { Db } from "./client.js";
import { sources as schemaSources } from "./schema.js";

export interface SourceSeed {
  code: string;
  name: string;
  baseUrl: string;
  status: "unknown" | "investigated" | "technically_tested" | "approved_for_use" | "blocked";
  termsUrl: string | null;
  robotsUrl: string | null;
  notes: string | null;
  investigatedAt: Date | null;
}

/**
 * Source registry, reflecting docs/SOURCES.md.
 * Keep this in sync with the docs: the seed is the machine-readable copy.
 */
export const sourceSeeds: SourceSeed[] = [
  {
    code: "gearvn",
    name: "GEARVN",
    baseUrl: "https://gearvn.com",
    status: "approved_for_use",
    termsUrl: "https://gearvn.com/pages/dieu-khoan-dich-vu",
    robotsUrl: "https://gearvn.com/robots.txt",
    notes: [
      "Personal, non-commercial project (owner decision 2026-11-01).",
      "POC 2026-11-01: category + product pages HTTP 200 with descriptive bot UA, server-rendered, JSON-LD Product available.",
      "ToS does not address automated collection explicitly; owner accepted the residual risk for personal use.",
      "Rate limits: one request at a time, >=2s delay, no CAPTCHA/login/paywall bypass.",
    ].join(" "),
    investigatedAt: new Date("2026-11-01T00:00:00Z"),
  },
  {
    code: "phongvu",
    name: "Phong Vũ",
    baseUrl: "https://phongvu.vn",
    status: "blocked",
    termsUrl: "https://help.phongvu.vn/chinh-sach-ban-hang/dieu-kien-giao-dich",
    robotsUrl: "https://phongvu.vn/robots.txt",
    notes: [
      "ToS art. 14.2 restricts downloading/copying/reusing content for business or commercial purposes; personal reference allowed.",
      "Automatic collection considered legally ambiguous; disabled until owner obtains a clear decision.",
    ].join(" "),
    investigatedAt: new Date("2026-11-01T00:00:00Z"),
  },
  {
    code: "cellphones",
    name: "CellphoneS",
    baseUrl: "https://cellphones.com.vn",
    status: "investigated",
    termsUrl: "https://cellphones.com.vn/tos",
    robotsUrl: "https://cellphones.com.vn/robots.txt",
    notes: [
      "ToS page returns 200 but the substantive clauses are loaded dynamically and could not be extracted.",
      "Manual review required before any collection.",
    ].join(" "),
    investigatedAt: new Date("2026-11-01T00:00:00Z"),
  },
];

/**
 * Idempotent seed: upserts by `code`. Existing rows keep their id so listings
 * and runs that reference them stay valid on re-seed.
 */
export async function seedSources(db: Db): Promise<void> {
  for (const source of sourceSeeds) {
    await db
      .insert(schemaSources)
      .values({
        code: source.code,
        name: source.name,
        baseUrl: source.baseUrl,
        status: source.status,
        termsUrl: source.termsUrl,
        robotsUrl: source.robotsUrl,
        notes: source.notes,
        investigatedAt: source.investigatedAt,
      })
      .onConflictDoUpdate({
        target: schemaSources.code,
        set: {
          name: sql`excluded.name`,
          baseUrl: sql`excluded.base_url`,
          status: sql`excluded.status`,
          termsUrl: sql`excluded.terms_url`,
          robotsUrl: sql`excluded.robots_url`,
          notes: sql`excluded.notes`,
          investigatedAt: sql`excluded.investigated_at`,
          updatedAt: sql`now()`,
        },
      });
  }
}

