import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import type { TrackPageData } from "./load-track-page";

const SHARD_LIMIT = 8;
const shardCache = new Map<string, Promise<Record<string, TrackPageData>>>();

function shardPath(prefix: string): string {
  return join(process.cwd(), "data", "static-graph", "tracks", `${prefix}.json.gz`);
}

async function readShard(prefix: string): Promise<Record<string, TrackPageData>> {
  const compressed = await readFile(shardPath(prefix));
  const data: unknown = JSON.parse(gunzipSync(compressed).toString("utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid static track shard ${prefix}`);
  }
  return data as Record<string, TrackPageData>;
}

/** Exact precomputed output from the former graph loader, partitioned by RVTR. */
export async function loadStaticTrackPage(rvtrParam: string): Promise<TrackPageData | null> {
  const rvtr = rvtrParam.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(rvtr)) return null;
  const prefix = rvtr.slice(4, 6);
  let shard = shardCache.get(prefix);
  if (!shard) {
    shard = readShard(prefix).catch((error) => {
      shardCache.delete(prefix);
      throw error;
    });
    shardCache.set(prefix, shard);
    while (shardCache.size > SHARD_LIMIT) {
      const oldest = shardCache.keys().next().value;
      if (oldest) shardCache.delete(oldest);
    }
  }
  return (await shard)[rvtr] ?? null;
}
