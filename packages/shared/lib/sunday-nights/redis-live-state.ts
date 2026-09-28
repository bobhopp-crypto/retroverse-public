import "server-only";

/** Small ephemeral state only; never use this store for the music graph. */
export const REDIS_LIVE_STATE_KEY = "rv:live:sunday-nights:v2";
export const REDIS_SELECTOR_KEY = "rv:live:experience-selector:v1";
export const REDIS_CONTROL_KEY = "rv:live:live-control:v1";
export const REDIS_BROADCAST_KEY = "rv:live:broadcast-snapshot:v1";

function config(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

export function redisLiveStateConfigured(): boolean {
  return config() !== null;
}

async function command(args: (string | number)[]): Promise<unknown> {
  const credentials = config();
  if (!credentials) throw new Error("Live state store is not configured (KV_REST_API_URL / KV_REST_API_TOKEN).");
  const response = await fetch(credentials.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Live state store request failed (${response.status}).`);
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error("Live state store command failed.");
  return result.result ?? null;
}

export async function redisJsonGet(key: string): Promise<Record<string, unknown> | null> {
  const result = await command(["GET", key]);
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
  const result = await command(["SET", key, JSON.stringify(value)]);
  if (result !== "OK") throw new Error("Live state store write was not acknowledged.");
}
