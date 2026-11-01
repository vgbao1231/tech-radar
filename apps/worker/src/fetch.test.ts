import { describe, expect, it, vi } from "vitest";
import { FetchError, PoliteFetcher } from "./fetch.js";

const html = (body = "ok", status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html" } });

describe("PoliteFetcher", () => {
  it("sends the configured user agent and returns the body", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => html("<html>hi</html>"));
    const fetcher = new PoliteFetcher({
      userAgent: "TechRadarBot/0.1 (test)",
      minDelayMs: 1,
      fetchImpl,
      sleep: async () => {},
    });
    const result = await fetcher.get("https://example.invalid/page");
    expect(result.body).toBe("<html>hi</html>");
    const headers = fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["user-agent"]).toBe("TechRadarBot/0.1 (test)");
  });

  it("waits the configured delay between requests", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const fetcher = new PoliteFetcher({
      userAgent: "TechRadarBot/0.1 (test)",
      minDelayMs: 2_000,
      fetchImpl: async () => html(),
      sleep,
    });
    await fetcher.get("https://example.invalid/a");
    await fetcher.get("https://example.invalid/b");
    expect(sleep).toHaveBeenCalled();
    const waited = sleep.mock.calls[0]![0] as number;
    expect(waited).toBeGreaterThan(1_900);
    expect(waited).toBeLessThanOrEqual(2_000);
  });

  it("retries transient 5xx responses with backoff", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    let calls = 0;
    const fetcher = new PoliteFetcher({
      userAgent: "TechRadarBot/0.1 (test)",
      minDelayMs: 1,
      retries: 2,
      sleep,
      fetchImpl: async () => {
        calls += 1;
        return calls === 1 ? html("boom", 503) : html("recovered");
      },
    });
    const result = await fetcher.get("https://example.invalid/flaky");
    expect(result.body).toBe("recovered");
    expect(calls).toBe(2);
    const backoff = sleep.mock.calls[0]![0] as number;
    expect(backoff).toBeGreaterThanOrEqual(1_000);
  });

  it("does not retry a 404 and surfaces the status", async () => {
    let calls = 0;
    const fetcher = new PoliteFetcher({
      userAgent: "TechRadarBot/0.1 (test)",
      minDelayMs: 1,
      sleep: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return html("nope", 404);
      },
    });
    await expect(fetcher.get("https://example.invalid/missing")).rejects.toBeInstanceOf(FetchError);
    expect(calls).toBe(1);
  });

  it("honours Retry-After on 429", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    let calls = 0;
    const fetcher = new PoliteFetcher({
      userAgent: "TechRadarBot/0.1 (test)",
      minDelayMs: 1,
      retries: 1,
      sleep,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response("slow down", { status: 429, headers: { "retry-after": "3" } });
        return html("ok");
      },
    });
    await fetcher.get("https://example.invalid/limited");
    const waits = sleep.mock.calls.map((call) => call[0] as number);
    expect(waits).toContain(3_000);
  });
});
