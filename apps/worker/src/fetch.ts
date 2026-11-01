export interface FetchResult {
  status: number;
  body: string;
  url: string;
}

export interface FetcherOptions {
  userAgent: string;
  /** Minimum gap between two requests to the same host. */
  minDelayMs: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

/**
 * Small politeness layer: one request at a time, a fixed delay between calls,
 * bounded retries with exponential backoff. It never retries 4xx other than
 * 429, and it never attempts to defeat a block page.
 */
export class PoliteFetcher {
  private lastRequestAt = 0;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: FetcherOptions) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.retries = options.retries ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
  }

  private async waitTurn(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const wait = this.options.minDelayMs - elapsed;
    if (wait > 0) await this.sleep(wait);
    this.lastRequestAt = Date.now();
  }

  async get(url: string): Promise<FetchResult> {
    let attempt = 0;
    for (;;) {
      await this.waitTurn();
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          headers: {
            "user-agent": this.options.userAgent,
            accept: "text/html,application/xhtml+xml",
            "accept-language": "vi,en;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        if (attempt >= this.retries) {
          throw new FetchError(`Network error for ${url}: ${(error as Error).message}`, null);
        }
        attempt += 1;
        await this.sleep(1_000 * 2 ** attempt);
        continue;
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt >= this.retries) {
          throw new FetchError(`HTTP ${response.status} for ${url}`, response.status);
        }
        const retryAfter = Number(response.headers.get("retry-after"));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 1_000 * 2 ** attempt;
        attempt += 1;
        await this.sleep(backoff);
        continue;
      }

      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status} for ${url}`, response.status);
      }

      return { status: response.status, body: await response.text(), url: response.url || url };
    }
  }
}
