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
  all: boolean;
  categoryPaths?: string[];
  enrichDetails: boolean;
  live: boolean;
  loop: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { source: "gearvn", all: false, enrichDetails: false, live: false, loop: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--") continue;
    if (arg === "--source") args.source = argv[++i] ?? args.source;
    else if (arg === "--all") args.all = true;
    else if (arg === "--category") args.categoryPaths = [...(args.categoryPaths ?? []), argv[++i]!];
    else if (arg === "--enrich") args.enrichDetails = true;
    else if (arg === "--live") args.live = true;
    else if (arg === "--loop") args.loop = true;
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
const handle = await createDbHandleFromEnv();

const sourcesToRun = args.all ? Object.keys(adapters) : [args.source];

async function runOnce(): Promise<void> {
  for (const code of sourcesToRun) {
    const adapter = getAdapter(code);
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
    } catch (error) {
      logger.error({ source: code, err: error }, "source run failed");
    }
  }
}

try {
  await runOnce();
  if (args.loop) {
    const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 21600000);
    logger.info({ intervalMs }, "entering loop mode");
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      await runOnce();
    }
  }
} finally {
  await handle.close();
}
