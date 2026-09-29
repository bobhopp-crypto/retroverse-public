import "server-only";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";

const prefix = process.env.RETROVERSE_PASS_KEY_PREFIX?.trim() || "rv:pass:";
export const PASS_KEYS = {
  passes: `${prefix}passes:v1`,
  visitors: `${prefix}visitors:v1`,
  nextVisitorId: `${prefix}next-visitor-id:v1`,
  activity: `${prefix}activity:v1`,
  nextActivityId: `${prefix}next-activity-id:v1`,
  registrations: `${prefix}collector-registrations:v1`,
  nextRegistrationId: `${prefix}next-registration-id:v1`,
  contacts: `${prefix}contacts:v1`,
  nextContactId: `${prefix}next-contact-id:v1`,
};

export function parseRedisJson<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try { return JSON.parse(raw) as T; } catch { throw new Error("Pass store contains an invalid record."); }
}

export async function hashGet<T>(key: string, field: string): Promise<T | null> {
  return parseRedisJson<T>(await redisCommand(["HGET", key, field]));
}

export async function hashValues<T>(key: string): Promise<T[]> {
  const result = await redisCommand(["HVALS", key]);
  if (!Array.isArray(result)) return [];
  return result.map((raw) => parseRedisJson<T>(raw)).filter((item): item is T => item !== null);
}

export async function hashSet(key: string, field: string, value: unknown): Promise<void> {
  await redisCommand(["HSET", key, field, JSON.stringify(value)]);
}
