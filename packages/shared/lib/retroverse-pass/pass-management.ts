import "server-only";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import { PASS_KEYS, hashValues, parseRedisJson } from "./redis-data";
import { updatePassVisitor } from "./store";
import { parsePassCredential, type PassActivity, type RetroversePass, type RetroverseVisitor } from "./types";

export type PassManagementRow = {
  serial: string; claimed: boolean; claimedAt: string | null; visitorId: number | null;
  firstName: string | null; lastName: string | null; email: string | null; phone: string | null;
};
export type PassManagementSummary = { totalPasses: number; claimed: number; unclaimed: number; claimedToday: number };
export type PassActivityRow = { id: number; eventType: string; createdAt: string; visitorId: number | null };

function rowFor(pass: RetroversePass, visitor: RetroverseVisitor | undefined): PassManagementRow {
  return { serial: pass.serial, claimed: pass.claimed, claimedAt: pass.claimedAt,
    visitorId: pass.visitorId, firstName: visitor?.firstName ?? null, lastName: visitor?.lastName ?? null,
    email: visitor?.email ?? null, phone: visitor?.phone ?? null };
}
function isClaimedToday(value: string | null, now = new Date()): boolean {
  if (!value) return false;
  const when = new Date(value);
  return !Number.isNaN(when.getTime()) && when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() && when.getDate() === now.getDate();
}
export function summarizePassManagement(rows: PassManagementRow[]): PassManagementSummary {
  const claimed = rows.filter((row) => row.claimed).length;
  return { totalPasses: rows.length, claimed, unclaimed: rows.length - claimed,
    claimedToday: rows.filter((row) => row.claimed && isClaimedToday(row.claimedAt)).length };
}

export async function searchPassManagement(search = ""): Promise<{
  passes: PassManagementRow[]; summary: PassManagementSummary;
}> {
  const [passes, visitors] = await Promise.all([
    hashValues<RetroversePass>(PASS_KEYS.passes), hashValues<RetroverseVisitor>(PASS_KEYS.visitors),
  ]);
  const byId = new Map(visitors.map((visitor) => [visitor.id, visitor]));
  const all = passes.map((pass) => rowFor(pass, pass.visitorId == null ? undefined : byId.get(pass.visitorId)))
    .sort((a, b) => Number(b.claimed) - Number(a.claimed) ||
      (b.claimedAt ?? "").localeCompare(a.claimedAt ?? "") || a.serial.localeCompare(b.serial));
  const q = search.trim().toLowerCase();
  const filtered = !q ? all : all.filter((row) =>
    [row.serial, row.firstName, row.lastName, row.email].some((value) => value?.toLowerCase().includes(q)));
  return { passes: filtered.slice(0, 2000), summary: summarizePassManagement(all) };
}

export async function updatePassVisitorFields(serial: string, input: {
  firstName: string; lastName?: string | null; email?: string | null; phone?: string | null;
}): Promise<PassManagementRow> {
  const credential = parsePassCredential(serial);
  if (!credential) throw new Error("Invalid pass serial.");
  await updatePassVisitor({ serial: credential, ...input });
  const { passes } = await searchPassManagement(credential);
  const row = passes.find((pass) => pass.serial === credential);
  if (!row) throw new Error("Pass not found after update.");
  return row;
}

const EDIT_SCRIPT = `
local old = redis.call('HGET', KEYS[1], ARGV[2])
if not old then return cjson.encode({error='Pass not found.'}) end
local pass = cjson.decode(old)
local original = old
if ARGV[1] == 'rename' then
  if redis.call('HEXISTS', KEYS[1], ARGV[3]) == 1 then
    return cjson.encode({error='Pass serial already exists.'})
  end
  pass.serial = ARGV[3]
  redis.call('HSET', KEYS[1], ARGV[3], cjson.encode(pass))
  redis.call('HDEL', KEYS[1], ARGV[2])
  local size = redis.call('LLEN', KEYS[2])
  for i=0,size-1 do
    local item = cjson.decode(redis.call('LINDEX', KEYS[2], i))
    if item.passSerial == ARGV[2] then
      item.passSerial = ARGV[3]
      redis.call('LSET', KEYS[2], i, cjson.encode(item))
    end
  end
elseif ARGV[1] == 'reset' then
  pass.claimed = false
  pass.visitorId = cjson.null
  pass.claimedAt = cjson.null
  pass.status = 'never_registered'
  redis.call('HSET', KEYS[1], ARGV[2], cjson.encode(pass))
elseif ARGV[1] == 'delete' then
  redis.call('HDEL', KEYS[1], ARGV[2])
else
  return cjson.encode({error='Invalid pass edit.'})
end
local id = redis.call('INCR', KEYS[3])
local serial = ARGV[1] == 'rename' and ARGV[3] or ARGV[2]
local metadata = {action=ARGV[1]}
if ARGV[1] == 'rename' then metadata.from = ARGV[2]; metadata.to = ARGV[3] end
redis.call('RPUSH', KEYS[2], cjson.encode({id=id, visitorId=cjson.decode(original).visitorId,
  passSerial=serial, eventType='PASS_EDITED', metadata=metadata, createdAt=ARGV[4]}))
return cjson.encode({pass=ARGV[1] == 'delete' and cjson.decode(original) or pass})
`;

async function edit(action: "rename" | "reset" | "delete", serial: string, next = ""): Promise<PassManagementRow> {
  const raw = await redisCommand(["EVAL", EDIT_SCRIPT, 3,
    PASS_KEYS.passes, PASS_KEYS.activity, PASS_KEYS.nextActivityId,
    action, serial, next, new Date().toISOString()]);
  const result = parseRedisJson<{ pass?: RetroversePass; error?: string }>(raw);
  if (result?.error) throw new Error(result.error);
  if (!result?.pass) throw new Error("Pass edit was not acknowledged.");
  const visitors = await hashValues<RetroverseVisitor>(PASS_KEYS.visitors);
  return rowFor(result.pass, visitors.find((visitor) => visitor.id === result.pass?.visitorId));
}

export async function updatePassSerial(currentSerial: string, nextSerialInput: string): Promise<PassManagementRow> {
  const current = parsePassCredential(currentSerial);
  const next = parsePassCredential(nextSerialInput);
  if (!current || !next) throw new Error("Invalid pass serial.");
  if (current === next) {
    const row = (await searchPassManagement(current)).passes.find((pass) => pass.serial === current);
    if (!row) throw new Error("Pass not found.");
    return row;
  }
  return edit("rename", current, next);
}
export async function resetPassClaim(serial: string): Promise<PassManagementRow> {
  const credential = parsePassCredential(serial);
  if (!credential) throw new Error("Invalid pass serial.");
  return edit("reset", credential);
}
export async function deletePass(serial: string): Promise<PassManagementRow> {
  const credential = parsePassCredential(serial);
  if (!credential) throw new Error("Invalid pass serial.");
  return edit("delete", credential);
}
export async function listPassActivity(serial: string, limit = 20): Promise<PassActivityRow[]> {
  const credential = parsePassCredential(serial);
  if (!credential) return [];
  const raw = await redisCommand(["LRANGE", PASS_KEYS.activity, 0, -1]);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => parseRedisJson<PassActivity>(item))
    .filter((item): item is PassActivity => !!item && item.passSerial === credential)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.min(Math.max(limit, 1), 100))
    .map(({ id, eventType, createdAt, visitorId }) => ({ id, eventType, createdAt, visitorId }));
}
