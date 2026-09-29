import "server-only";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import { PASS_KEYS, hashGet, parseRedisJson } from "./redis-data";
import type {
  PassActivityEventType, PassScanResult, RetroversePass, RetroverseVisitor,
} from "./types";
import { parsePassCredential } from "./types";

export class PassRegistrationInputError extends Error {
  constructor(message: string) { super(message); this.name = "PassRegistrationInputError"; }
}

type VisitorInput = {
  serial: string; firstName: string; lastName?: string | null; email?: string | null;
  phone?: string | null; birthday?: string | null; postalCode?: string | null; marketingOptIn?: boolean;
};

function normalize(input: VisitorInput) {
  const serial = parsePassCredential(input.serial);
  const firstName = input.firstName.trim();
  if (!serial) throw new PassRegistrationInputError("Invalid pass credential.");
  if (!firstName) throw new PassRegistrationInputError("First name is required.");
  return {
    serial, firstName, lastName: input.lastName?.trim() || null,
    email: input.email?.trim() || null, phone: input.phone?.trim() || null,
    birthday: input.birthday?.trim() || null, postalCode: input.postalCode?.trim() || null,
    marketingOptIn: input.marketingOptIn === true,
  };
}

export async function scanPass(credential: string): Promise<PassScanResult | null> {
  const pass = await hashGet<RetroversePass>(PASS_KEYS.passes, credential);
  if (!pass) return null;
  if (!pass.claimed || pass.visitorId == null) return { state: "unclaimed", pass };
  const visitor = await hashGet<RetroverseVisitor>(PASS_KEYS.visitors, String(pass.visitorId));
  return visitor ? { state: "claimed", pass, visitor }
    : { state: "unclaimed", pass: { ...pass, claimed: false, visitorId: null } };
}

const CLAIM_SCRIPT = `
local priorRaw = redis.call('HGET', KEYS[1], ARGV[1])
local pass = priorRaw and cjson.decode(priorRaw) or {serial=ARGV[1], claimed=false,
  visitorId=cjson.null, claimedAt=cjson.null, status='never_registered'}
if pass.claimed and pass.visitorId ~= cjson.null then
  local visitorRaw = redis.call('HGET', KEYS[2], tostring(pass.visitorId))
  if not visitorRaw then return cjson.encode({error='Registered visitor is unavailable.'}) end
  return cjson.encode({state='claimed', pass=pass, visitor=cjson.decode(visitorRaw)})
end
local input = cjson.decode(ARGV[2])
local matched = nil
if input.email ~= cjson.null or input.phone ~= cjson.null then
  local visitors = redis.call('HVALS', KEYS[2])
  for _, raw in ipairs(visitors) do
    local visitor = cjson.decode(raw)
    local sameEmail = input.email ~= cjson.null and visitor.email ~= cjson.null and
      string.lower(visitor.email) == string.lower(input.email)
    local samePhone = input.phone ~= cjson.null and visitor.phone ~= cjson.null and visitor.phone == input.phone
    if sameEmail or samePhone then
      if not matched or visitor.createdAt < matched.createdAt then matched = visitor end
    end
  end
end
local visitor = matched
if not visitor then
  local id = redis.call('INCR', KEYS[3])
  visitor = {id=id, firstName=input.firstName, lastName=input.lastName, email=input.email,
    phone=input.phone, birthday=input.birthday, postalCode=input.postalCode,
    marketingOptIn=input.marketingOptIn, notes=cjson.null, createdAt=ARGV[3]}
  redis.call('HSET', KEYS[2], tostring(id), cjson.encode(visitor))
end
pass.claimed = true
pass.visitorId = visitor.id
pass.claimedAt = ARGV[3]
pass.status = 'registered'
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(pass))
local eventId = redis.call('INCR', KEYS[5])
redis.call('RPUSH', KEYS[4], cjson.encode({id=eventId, visitorId=visitor.id,
  passSerial=ARGV[1], eventType='PASS_CLAIMED', metadata=cjson.null, createdAt=ARGV[3]}))
return cjson.encode({state='claimed', pass=pass, visitor=visitor})
`;

const UPDATE_SCRIPT = `
local rawPass = redis.call('HGET', KEYS[1], ARGV[1])
if not rawPass then return cjson.encode({error='This pass is not registered yet.', input=true}) end
local pass = cjson.decode(rawPass)
if not pass.claimed or pass.visitorId == cjson.null then
  return cjson.encode({error='This pass is not registered yet.', input=true})
end
local rawVisitor = redis.call('HGET', KEYS[2], tostring(pass.visitorId))
if not rawVisitor then return cjson.encode({error='Registered visitor is unavailable.'}) end
local visitor = cjson.decode(rawVisitor)
local input = cjson.decode(ARGV[2])
visitor.firstName = input.firstName
visitor.lastName = input.lastName
visitor.email = input.email
visitor.phone = input.phone
visitor.birthday = input.birthday
visitor.postalCode = input.postalCode
visitor.marketingOptIn = input.marketingOptIn
redis.call('HSET', KEYS[2], tostring(visitor.id), cjson.encode(visitor))
local eventId = redis.call('INCR', KEYS[4])
redis.call('RPUSH', KEYS[3], cjson.encode({id=eventId, visitorId=visitor.id,
  passSerial=ARGV[1], eventType='PASS_EDITED', metadata=cjson.null, createdAt=ARGV[3]}))
return cjson.encode({state='claimed', pass=pass, visitor=visitor})
`;

function result(raw: unknown): PassScanResult & { state: "claimed" } {
  const decoded = parseRedisJson<PassScanResult & { state: "claimed"; error?: string; input?: boolean }>(raw);
  if (!decoded) throw new Error("Pass store did not acknowledge the change.");
  if (decoded.error) {
    if (decoded.input) throw new PassRegistrationInputError(decoded.error);
    throw new Error(decoded.error);
  }
  if (decoded.state !== "claimed") throw new Error("Pass store returned an invalid result.");
  return decoded;
}

export async function claimPass(input: VisitorInput): Promise<PassScanResult & { state: "claimed" }> {
  const normalized = normalize(input);
  return result(await redisCommand(["EVAL", CLAIM_SCRIPT, 5,
    PASS_KEYS.passes, PASS_KEYS.visitors, PASS_KEYS.nextVisitorId, PASS_KEYS.activity, PASS_KEYS.nextActivityId,
    normalized.serial, JSON.stringify(normalized), new Date().toISOString()]));
}

export async function updatePassVisitor(input: VisitorInput): Promise<PassScanResult & { state: "claimed" }> {
  const normalized = normalize(input);
  return result(await redisCommand(["EVAL", UPDATE_SCRIPT, 4,
    PASS_KEYS.passes, PASS_KEYS.visitors, PASS_KEYS.activity, PASS_KEYS.nextActivityId,
    normalized.serial, JSON.stringify(normalized), new Date().toISOString()]));
}

/** Append only an action that actually occurred. */
export async function recordPassActivity(input: {
  visitorId?: number | null; passSerial?: string | null; eventType: PassActivityEventType;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const id = Number(await redisCommand(["INCR", PASS_KEYS.nextActivityId]));
  await redisCommand(["RPUSH", PASS_KEYS.activity, JSON.stringify({
    id, visitorId: input.visitorId ?? null, passSerial: input.passSerial ?? null,
    eventType: input.eventType, metadata: input.metadata ?? null, createdAt: new Date().toISOString(),
  })]);
}
