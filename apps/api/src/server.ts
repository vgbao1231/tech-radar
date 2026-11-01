import { existsSync } from "node:fs";
import { createDbHandleFromEnv } from "@tech-radar/db";
import { buildApp } from "./app.js";

const envFile = new URL("../../../.env", import.meta.url).pathname;
if (existsSync(envFile)) process.loadEnvFile(envFile);

const handle = await createDbHandleFromEnv();
const app = await buildApp({
  db: handle.db,
  token: process.env.API_TOKEN,
  logger: true,
});

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? "127.0.0.1";

const shutdown = async () => {
  await app.close();
  await handle.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port, host });
