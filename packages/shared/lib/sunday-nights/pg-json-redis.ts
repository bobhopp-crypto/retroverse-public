import "server-only";

import { redisJsonGet, redisJsonSet } from "./redis-live-state";

type LoadPgJsonRedisOpts = {
  redisKey: string;
  pgKey: string;
  allowNeonHydrate?: boolean;
};

type SavePgJsonRedisOpts = {
  redisKey: string;
  pgKey: string;
  value: Record<string, unknown>;
  persistNeon?: boolean;
};

/**
 * Small public JSON documents in the live Redis store.
 * Artist profiles keep allowNeonHydrate and persistNeon false: Redis is the copy the site reads.
 * pgKey is reserved for a future Neon hydrate and is not a second write path today.
 */
export async function loadPgJsonRedis(opts: LoadPgJsonRedisOpts): Promise<Record<string, unknown> | null> {
  if (opts.allowNeonHydrate) {
    throw new Error(`Neon JSON hydrate is not configured for ${opts.pgKey}.`);
  }
  return redisJsonGet(opts.redisKey);
}

export async function savePgJsonRedis(opts: SavePgJsonRedisOpts): Promise<void> {
  if (opts.persistNeon) {
    throw new Error(`Neon JSON persistence is not configured for ${opts.pgKey}.`);
  }
  await redisJsonSet(opts.redisKey, opts.value);
}
