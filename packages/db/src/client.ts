import { mkdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema.js";

/**
 * The schema-typed database handle used across the app.
 * Both node-postgres (production/real PostgreSQL) and PGlite (local dev +
 * tests) satisfy it, so no application code depends on the driver.
 */
export type Db = PgDatabase<any, typeof schema>;

export interface DbHandle {
  db: Db;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

export const migrationsFolder = new URL("../drizzle", import.meta.url).pathname;

/** Repo root (packages/db/src → ../../..). Relative PGlite paths resolve here. */
export const repoRoot = new URL("../../../", import.meta.url).pathname;

export interface PgliteOptions {
  /** Directory for on-disk storage. Omit for an in-memory database. */
  dataDir?: string;
}

export async function createPgliteHandle(options: PgliteOptions = {}): Promise<DbHandle> {
  let client: PGlite;
  if (options.dataDir) {
    const dataDir = isAbsolute(options.dataDir) ? options.dataDir : resolve(repoRoot, options.dataDir);
    mkdirSync(dataDir, { recursive: true });
    client = new PGlite(dataDir);
  } else {
    client = new PGlite();
  }
  const db = drizzlePglite(client, { schema });
  return {
    db,
    migrate: async () => {
      await migratePglite(db, { migrationsFolder });
    },
    close: async () => {
      await client.close();
    },
  };
}

export interface PostgresOptions {
  connectionString: string;
  max?: number;
}

export async function createPostgresHandle(options: PostgresOptions): Promise<DbHandle> {
  const pool = new Pool({
    connectionString: options.connectionString,
    max: options.max ?? 5,
  });
  const db = drizzleNodePg(pool, { schema });
  return {
    db,
    migrate: async () => {
      await migrateNodePg(db, { migrationsFolder });
    },
    close: async () => {
      await pool.end();
    },
  };
}

export async function createDbHandleFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<DbHandle> {
  const url = env.DATABASE_URL;
  if (url && url.length > 0) {
    return createPostgresHandle({ connectionString: url });
  }
  // No DATABASE_URL: fall back to a local, embedded Postgres (dev only).
  return createPgliteHandle({ dataDir: env.PGLITE_DATA_DIR });
}
