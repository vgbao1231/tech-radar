import { existsSync } from "node:fs";
import { createDbHandleFromEnv } from "@tech-radar/db";
import { getAdapter, adapters } from "@tech-radar/sources";
import pino from "pino";
import { runSource } from "./run.js";

function loadEnv(): void {
  const path = new URL("../../../.env", import.meta.url).pathname;
  if (existsSync(path)) process.loadEnvFile(path);
}

interface CliArgs {
  source: string;
  categoryPaths?: string[];
  enrichDetails: boolean;
  live: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { source: "gearvn", enrichDetails: false, live: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--source") args.source = argv[++i] ?? args.source;
    else if (arg === "--category") args.categoryPaths = [...(args.categoryPaths ?? []), argv[++i]!];
    else if (arg === "--enrich") args.enrichDetails = true;
    else if (arg === "--live") args.live = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

loadEnv();
const args = parseArgs(process.argv.slice(2));

if (!args.live && process.env.ALLOW_LIVE_FETCH !== "1") {
  console.error(
    [
      "Refusing to hit the network without explicit confirmation.",
      "Pass --live (or ALLOW_LIVE_FETCH=1) to run a single polite pass.",
      `Available adapters: ${Object.keys(adapters).join(", ")}`,
    ].join("\n"),
  );
  process.exit(2);
}

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const adapter = getAdapter(args.source);
const handle = await createDbHandleFromEnv();

try {
  const result = await runSource({
    db: handle.db,
    adapter,
    categoryPaths: args.categoryPaths,
    enrichDetails: args.enrichDetails,
    logger,
  });
  logger.info(result, "scrape run finished");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await handle.close();
}
