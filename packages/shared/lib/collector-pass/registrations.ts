import "server-only";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import { PASS_KEYS, hashValues, parseRedisJson } from "@/lib/retroverse-pass/redis-data";
import { collectorPassRegistrationsToCsv } from "./csv";
import type { CollectorPassRegistration } from "./types";

export type { CollectorPassRegistration } from "./types";

const REGISTER_SCRIPT = `
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then
  return cjson.encode({error='Pass number already registered.'})
end
local id = redis.call('INCR', KEYS[2])
local value = cjson.decode(ARGV[2])
value.id = id
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(value))
return cjson.encode(value)
`;

export async function registerCollectorPass(input: {
  passNumber: string; firstName: string; lastName: string; email?: string | null;
}): Promise<CollectorPassRegistration> {
  const passNumber = input.passNumber.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email?.trim() || null;
  if (!passNumber || !firstName || !lastName) {
    throw new Error("Pass number, first name, and last name are required.");
  }
  const raw = await redisCommand(["EVAL", REGISTER_SCRIPT, 2,
    PASS_KEYS.registrations, PASS_KEYS.nextRegistrationId, passNumber,
    JSON.stringify({ passNumber, firstName, lastName, email, createdAt: new Date().toISOString() })]);
  const record = parseRedisJson<CollectorPassRegistration & { error?: string }>(raw);
  if (!record) throw new Error("Registration failed");
  if (record.error) throw new Error(record.error);
  return record;
}

function matches(record: CollectorPassRegistration, search: string): boolean {
  const q = search.trim().toLowerCase();
  return !q || [record.passNumber, record.firstName, record.lastName, record.email ?? ""]
    .some((value) => value.toLowerCase().includes(q));
}

export async function listCollectorPassRegistrations(input?: {
  search?: string; limit?: number;
}): Promise<CollectorPassRegistration[]> {
  const limit = Math.min(Math.max(input?.limit ?? 500, 1), 2000);
  const records = await hashValues<CollectorPassRegistration>(PASS_KEYS.registrations);
  return records.filter((record) => matches(record, input?.search ?? ""))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function countCollectorPassRegistrations(search?: string): Promise<number> {
  const records = await hashValues<CollectorPassRegistration>(PASS_KEYS.registrations);
  return records.filter((record) => matches(record, search ?? "")).length;
}

export async function exportCollectorPassRegistrationsCsv(search?: string): Promise<string> {
  const rows = await listCollectorPassRegistrations({ search, limit: 2000 });
  return collectorPassRegistrationsToCsv(rows);
}
