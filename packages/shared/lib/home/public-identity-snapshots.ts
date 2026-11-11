import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { opsStateDir } from "@/lib/ops/ops-state-path";
import { loadLiveStateRecord } from "@/lib/sunday-nights/live-state-io";
import {
  REDIS_BROADCAST_KEY,
  REDIS_SELECTOR_KEY,
  redisJsonGet,
} from "@/lib/sunday-nights/redis-live-state";

// Read existing records only. Unlike the full state loaders, missing records
// and timestamps stay missing. No fallback creates a fresh observation.
async function localRecord(...parts: string[]): Promise<unknown> {
  try {
    return JSON.parse(await readFile(join(opsStateDir(), ...parts), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export const identitySnapshotReaders = {
  live: loadLiveStateRecord,
  selector: (): Promise<unknown> => process.env.VERCEL === "1"
    ? redisJsonGet(REDIS_SELECTOR_KEY)
    : localRecord("bobos", "experience-selector", "state.json"),
  broadcast: (): Promise<unknown> => process.env.VERCEL === "1"
    ? redisJsonGet(REDIS_BROADCAST_KEY)
    : localRecord("bobos", "presentation", "broadcast.json"),
  mixer: (): Promise<unknown> => localRecord("bobos", "mixer", "state.json"),
  presentation: (): Promise<unknown> => localRecord("bobos", "presentation", "state.json"),
};
