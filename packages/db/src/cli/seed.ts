import { createDbHandleFromEnv } from "../client.js";
import { sources } from "../schema.js";
import { seedSources } from "../seed.js";
import { loadEnv } from "./env.js";

loadEnv();

const handle = await createDbHandleFromEnv();
try {
  await seedSources(handle.db);
  const rows = await handle.db.select({ code: sources.code, status: sources.status }).from(sources);
  console.log(`[db:seed] ${rows.length} sources:`);
  for (const row of rows) console.log(`  - ${row.code}: ${row.status}`);
} finally {
  await handle.close();
}
