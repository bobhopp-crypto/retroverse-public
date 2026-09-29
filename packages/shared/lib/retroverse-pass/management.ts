import "server-only";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import { PASS_KEYS, hashGet, hashSet, hashValues, parseRedisJson } from "./redis-data";
import type { RetroversePass, RetroverseVisitor } from "./types";

export type Member = {
  id: number; firstName: string; lastName: string | null; email: string | null; phone: string | null;
  birthday: string | null; postalCode: string | null; marketingOptIn: boolean; notes: string | null;
  createdAt: string; passSerial: string | null; registeredAt: string | null;
};
export type PassRecord = { serial: string; claimed: boolean; visitorId: number | null; claimedAt: string | null; status: string };

export async function listMembers(search = ""): Promise<Member[]> {
  const [visitors, passes] = await Promise.all([
    hashValues<RetroverseVisitor>(PASS_KEYS.visitors), hashValues<RetroversePass>(PASS_KEYS.passes),
  ]);
  const passByVisitor = new Map(passes.filter((pass) => pass.visitorId != null).map((pass) => [pass.visitorId!, pass]));
  const q = search.trim().toLowerCase();
  return visitors.map((visitor) => {
    const pass = passByVisitor.get(visitor.id);
    return {
      id: visitor.id, firstName: visitor.firstName, lastName: visitor.lastName ?? null,
      email: visitor.email, phone: visitor.phone, birthday: visitor.birthday ?? null,
      postalCode: visitor.postalCode ?? null, marketingOptIn: visitor.marketingOptIn ?? false,
      notes: visitor.notes ?? null, createdAt: visitor.createdAt,
      passSerial: pass?.serial ?? null, registeredAt: pass?.claimedAt ?? null,
    };
  }).filter((member) => !q || [member.firstName, member.lastName, member.email, member.phone]
    .some((value) => value?.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveMember(input: Partial<Member> & { firstName: string }): Promise<number> {
  const id = Number(await redisCommand(["INCR", PASS_KEYS.nextVisitorId]));
  const visitor: RetroverseVisitor = {
    id, firstName: input.firstName.trim(), lastName: input.lastName || null,
    email: input.email || null, phone: input.phone || null, birthday: input.birthday || null,
    postalCode: input.postalCode || null, marketingOptIn: input.marketingOptIn ?? false,
    notes: input.notes || null, createdAt: new Date().toISOString(),
  };
  await hashSet(PASS_KEYS.visitors, String(id), visitor);
  return id;
}

export async function updateMember(id: number, input: Partial<Member> & { firstName: string }): Promise<void> {
  const existing = await hashGet<RetroverseVisitor>(PASS_KEYS.visitors, String(id));
  if (!existing) return;
  await hashSet(PASS_KEYS.visitors, String(id), {
    ...existing, firstName: input.firstName.trim(), lastName: input.lastName || null,
    email: input.email || null, phone: input.phone || null, birthday: input.birthday || null,
    postalCode: input.postalCode || null, marketingOptIn: input.marketingOptIn ?? false,
    notes: input.notes || null,
  });
}

export async function listPasses(search = ""): Promise<PassRecord[]> {
  const q = search.trim().toLowerCase();
  return (await hashValues<RetroversePass>(PASS_KEYS.passes))
    .filter((pass) => !q || pass.serial.toLowerCase().includes(q))
    .sort((a, b) => a.serial.localeCompare(b.serial))
    .map((pass) => ({ serial: pass.serial, claimed: pass.claimed, visitorId: pass.visitorId,
      claimedAt: pass.claimedAt, status: pass.claimed ? "registered" : "never_registered" }));
}

const ASSIGN_SCRIPT = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return cjson.encode({error='Pass does not exist.'}) end
local pass = cjson.decode(raw)
if ARGV[2] == '' then
  pass.claimed = false
  pass.visitorId = cjson.null
  pass.claimedAt = cjson.null
  pass.status = 'never_registered'
else
  if redis.call('HEXISTS', KEYS[2], ARGV[2]) == 0 then
    return cjson.encode({error='Member does not exist.'})
  end
  pass.claimed = true
  pass.visitorId = tonumber(ARGV[2])
  if pass.claimedAt == cjson.null then pass.claimedAt = ARGV[3] end
  pass.status = 'registered'
end
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(pass))
return 'OK'
`;

export async function assignPass(serial: string, memberId: number | null): Promise<void> {
  const raw = await redisCommand(["EVAL", ASSIGN_SCRIPT, 2, PASS_KEYS.passes, PASS_KEYS.visitors,
    serial, memberId == null ? "" : String(memberId), new Date().toISOString()]);
  if (raw === "OK") return;
  const result = parseRedisJson<{ error?: string }>(raw);
  throw new Error(result?.error || "Pass assignment failed.");
}
