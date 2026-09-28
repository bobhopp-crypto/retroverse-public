import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { REDIS_LIVE_STATE_KEY, redisJsonGet, redisJsonSet } from "./redis-live-state";
import type { SundayNightsState } from "./types";

function localPath(): string {
  return join(opsStateDir(), "sunday-nights", "state.json");
}

export async function loadLiveStateRecord(): Promise<Record<string, unknown> | null> {
  if (process.env.VERCEL === "1") return redisJsonGet(REDIS_LIVE_STATE_KEY);
  try {
    const value: unknown = JSON.parse(await readFile(localPath(), "utf8"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function saveLiveStateRecord(state: SundayNightsState): Promise<void> {
  if (process.env.VERCEL === "1") {
    await redisJsonSet(REDIS_LIVE_STATE_KEY, state as unknown as Record<string, unknown>);
    return;
  }
  const path = localPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
