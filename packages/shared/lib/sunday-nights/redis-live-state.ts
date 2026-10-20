import "server-only";

/** Small ephemeral state only; never use this store for the music graph. */
export const REDIS_LIVE_STATE_KEY = "rv:live:sunday-nights:v2";
export const REDIS_SELECTOR_KEY = "rv:live:experience-selector:v1";
export const REDIS_CONTROL_KEY = "rv:live:live-control:v1";
export const REDIS_BROADCAST_KEY = "rv:live:broadcast-snapshot:v1";

function config(): { url: string; token: string } | null {
  const url = process.env.LIVE_KV_REST_API_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token = process.env.LIVE_KV_REST_API_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

export function redisLiveStateConfigured(): boolean {
  return config() !== null;
}

/** In-memory stand-in for the REST KV. Production leaves this unset. */
let testKv: Map<string, unknown> | null = null;
let testLatencyMs = 0;

export function setRedisKvForTests(kv: Map<string, unknown> | null): void {
  testKv = kv;
}

/** Delay test-store commands so page-budget tests can abort a slow read. */
export function setRedisLatencyForTests(ms: number | null): void {
  testLatencyMs = ms && ms > 0 ? ms : 0;
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("The operation was aborted");
}

async function waitForTestLatency(signal?: AbortSignal): Promise<void> {
  if (testLatencyMs <= 0) {
    if (signal?.aborted) throw abortError(signal);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }
    const timer = setTimeout(resolve, testLatencyMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(abortError(signal));
    }, { once: true });
  });
}

export async function redisCommand(args: (string | number)[], signal?: AbortSignal): Promise<unknown> {
  if (testKv) {
    await waitForTestLatency(signal);
    const command = String(args[0] ?? "").toUpperCase();
    const key = String(args[1] ?? "");
    if (command === "GET") {
      const value = testKv.get(key);
      return value === undefined ? null : value;
    }
    if (command === "SET") {
      testKv.set(key, args[2]);
      return "OK";
    }
    if (command === "DEL") {
      return testKv.delete(key) ? 1 : 0;
    }
    throw new Error(`Live state test store does not implement ${command}.`);
  }
  const credentials = config();
  if (!credentials) throw new Error("Live state store is not configured (LIVE_KV_REST_API_URL / LIVE_KV_REST_API_TOKEN).");
  const budget = AbortSignal.timeout(10_000);
  const response = await fetch(credentials.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, budget]) : budget,
  });
  if (!response.ok) throw new Error(`Live state store request failed (${response.status}).`);
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error("Live state store command failed.");
  return result.result ?? null;
}

export async function redisJsonGet(key: string, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  const result = await redisCommand(["GET", key], signal);
  if (typeof result !== "string") return null;
  try {
    const value: unknown = JSON.parse(result);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch {
    throw new Error("Live state store contains an invalid record.");
  }
}

export async function redisJsonSet(key: string, value: Record<string, unknown>): Promise<void> {
  const result = await redisCommand(["SET", key, JSON.stringify(value)]);
  if (result !== "OK") throw new Error("Live state store write was not acknowledged.");
}

export async function redisJsonDel(key: string): Promise<void> {
  await redisCommand(["DEL", key]);
}
