import { createPgliteHandle, type DbHandle } from "./client.js";

/**
 * Test helper: fresh in-memory Postgres with the full schema applied.
 * Call `close()` in `afterAll`.
 */
export async function createTestDb(options: { seed?: boolean } = {}): Promise<DbHandle> {
  const handle = await createPgliteHandle();
  await handle.migrate();
  if (options.seed) {
    const { seedSources } = await import("./seed.js");
    await seedSources(handle.db);
  }
  return handle;
}
