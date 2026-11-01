import { createDbHandleFromEnv } from "../client.js";
import { loadEnv } from "./env.js";

loadEnv();

const handle = await createDbHandleFromEnv();
try {
  await handle.migrate();
  const target = process.env.DATABASE_URL ?? `pglite:${process.env.PGLITE_DATA_DIR ?? "in-memory"}`;
  console.log(`[db:migrate] applied migrations to ${target}`);
} finally {
  await handle.close();
}
