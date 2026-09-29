import "server-only";

import { redisCommand, redisLiveStateConfigured } from "@/lib/sunday-nights/redis-live-state";

export async function passStoreStatus(): Promise<{ ok: boolean; error?: string }> {
  if (!redisLiveStateConfigured()) {
    return { ok: false, error: "Pass store is not configured." };
  }
  try {
    const pong = await redisCommand(["PING"]);
    return pong === "PONG" ? { ok: true } : { ok: false, error: "Pass store did not respond." };
  } catch {
    return { ok: false, error: "Pass store is unavailable." };
  }
}
