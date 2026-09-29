import "server-only";

import { redisJsonGet, redisJsonSet } from "./redis-live-state";

const PREFIX = "rv:public-state:v1:";

export async function remoteStateGet<T extends Record<string, unknown>>(key: string): Promise<T | null> {
  return await redisJsonGet(`${PREFIX}${key}`) as T | null;
}

export async function remoteStateSet(key: string, value: Record<string, unknown>): Promise<void> {
  await redisJsonSet(`${PREFIX}${key}`, value);
}
