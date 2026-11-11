import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Dependencies, Permit } from "./openai-adapter";

export const MONTHLY_LIMIT_MICROS = 20_000_000;
export const MONTHLY_LEDGER_KEY = "rv:research:budget:{retroverse-app}:monthly-v1";
const MAX_TIME = 4_133_980_800_000;
export const MAX_CLOCK_SKEW_MS = 2000;

/**
 * Offline implementation only. Nothing imports this into the disabled live service.
 * USD reservations are assigned to UTC calendar months, not provider invoice dates.
 * This cannot cap other applications, taxes, hosting, Redis, or direct key usage.
 *
 * Before activation, independently verify the complete per-request charge bound and
 * linearizable durable storage that cannot lose acknowledged reservations on failover,
 * rollback or restore. These attestations are required operator inputs, not proof.
 * Missing state fails closed, but a silently rolled-back valid snapshot is not detectable.
 * No implementation can promise an invoice cap based only on output/tool/time limits.
 *
 * The operator must separately provision a non-expiring, version-2 ledger containing
 * limitMicros, canonical UTC monthStartMs/monthEndMs, reservedMicros, requestCount,
 * lastSeenMs, leases and a centrally reviewed policies registry. No default approval
 * is created. Registry keys are the SHA-256 configuration fingerprints sent as policy.
 * Every reserve/check/finish validates central approval, exact cost, model, pricing
 * version, tool/output limits and validity. Revocation denies subsequent reservations
 * and lease checks; it cannot recall a call already authorized or dispatched.
 * Approval changes must atomically update, or compare-and-swap against, the current
 * shared ledger. Never replace it with a stale snapshot that could overwrite spending,
 * ownership or clock metadata. Policies survive UTC month rollover.
 * Registry entries have approved, model, pricingVersion, reservationMicros,
 * maxOutputTokens, maxToolCalls, validFromMs, validUntilMs and reference fields.
 *
 * Redis TIME must agree with independently sampled application-server time within
 * two seconds and within the same UTC month. The ledger records a monotonic lastSeenMs,
 * including valid-but-denied checks. Disagreement never resets money. Both clocks
 * drifting together and a valid silently rolled-back snapshot remain undetectable.
 * Initial amounts must include prior app charges/reservations for that month.
 * This module deliberately has no provisioning, reset, credential or network function.
 * Reuse this exact key across deployments, models, instances and paid entry points.
 */
export type MonthlyBudgetConfig = {
  enabled: boolean;
  model: string;
  pricingVersion: string;
  reservationMicros: number;
  cooldownMs: number;
  costBound: {
    verified: true;
    includesAllBillableInput: true;
    includesSearchContentInput: true;
    includesOutputAndReasoning: true;
    includesToolCharges: true;
    reference: string;
    validUntilMs: number;
  };
  durableStore: {
    verified: true;
    acknowledgedReservationsSurviveFailover: true;
    noEviction: true;
    reference: string;
  };
};

export type MonthlyAtomicStore = {
  // One atomic durable primary operation. Honor abort. Never retry uncertain writes.
  eval(script: string, keys: string[], args: string[], signal: AbortSignal): Promise<unknown>;
};

export const MONTHLY_BUDGET_SCRIPT = `
-- This script never provisions a ledger, refunds reservations, or sets a TTL.
local KEY = 'rv:research:budget:{retroverse-app}:monthly-v1'
local LIMIT, MAX_REQUESTS = 20000000, 10000
local MAX_TIME = 4133980800000 -- 2101-01-01 UTC, exclusive
local function integer(value, minimum, maximum)
  return type(value) == 'number' and value == value and value == math.floor(value) and value >= minimum and value <= maximum
end
local function hash(value)
  return type(value) == 'string' and #value == 64 and not string.find(value, '[^a-f0-9]')
end
-- Redis Lua does not expose os.date. Gregorian UTC calculation, bounded to 1970-2100.
local function monthBounds(milliseconds)
  if not integer(milliseconds, 0, MAX_TIME - 1) then return nil end
  local totalDays = math.floor(milliseconds / 86400000)
  local remaining, year = totalDays, 1970
  local function leap(y) return y % 4 == 0 and (y % 100 ~= 0 or y % 400 == 0) end
  while remaining >= (leap(year) and 366 or 365) do
    remaining = remaining - (leap(year) and 366 or 365)
    year = year + 1
  end
  local lengths = {31, leap(year) and 29 or 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}
  local month = 1
  while remaining >= lengths[month] do remaining = remaining - lengths[month]; month = month + 1 end
  local start = (totalDays - remaining) * 86400000
  return start, start + lengths[month] * 86400000
end
if #KEYS ~= 1 or KEYS[1] ~= KEY or #ARGV ~= 12 then return 0 end
local op, policy, song, token = ARGV[1], ARGV[2], ARGV[3], ARGV[4]
local cost, cooldown, leaseMs, deadline, pricesValidUntil = tonumber(ARGV[5]), tonumber(ARGV[6]), tonumber(ARGV[7]), tonumber(ARGV[8]), tonumber(ARGV[9])
if (op ~= 'reserve' and op ~= 'check' and op ~= 'finish') or not hash(policy) or not hash(song) or type(token) ~= 'string' or #token ~= 36 then return 0 end
if not integer(cost, 1, LIMIT) or not integer(cooldown, 10000, 86400000) or not integer(leaseMs, 1, 10000) or not integer(deadline, 0, MAX_TIME - 1) or not integer(pricesValidUntil, 1, MAX_TIME - 1) then return 0 end
local time = redis.call('TIME')
local seconds, micros = tonumber(time[1]), tonumber(time[2])
if not integer(seconds, 0, MAX_TIME / 1000 - 1) or not integer(micros, 0, 999999) then return 0 end
local now = seconds * 1000 + math.floor(micros / 1000)
local monthStart, monthEnd = monthBounds(now)
local serverTime = tonumber(ARGV[12])
if not integer(serverTime, 1, MAX_TIME - 1) or math.abs(serverTime - now) > 2000 then return 0 end
local serverMonth = monthBounds(serverTime)
if not monthStart or serverMonth ~= monthStart then return 0 end
local raw = redis.call('GET', KEY)
-- Lost, unprovisioned, evicted, or expiring accounting must never replenish money.
if not raw or redis.call('PTTL', KEY) ~= -1 then return 0 end
local decoded, ledger = pcall(cjson.decode, raw)
if not decoded or type(ledger) ~= 'table' or ledger.version ~= 2 or ledger.limitMicros ~= LIMIT
  or not integer(ledger.monthStartMs, 0, MAX_TIME - 1) or not integer(ledger.monthEndMs, 1, MAX_TIME)
  or not integer(ledger.reservedMicros, 0, LIMIT) or not integer(ledger.requestCount, 0, MAX_REQUESTS)
  or ledger.reservedMicros < ledger.requestCount or type(ledger.leases) ~= 'table'
  or type(ledger.policies) ~= 'table' or not integer(ledger.lastSeenMs, ledger.monthStartMs, MAX_TIME - 1)
  or now < ledger.lastSeenMs then return 0 end
-- Central approvals are authoritative, not a stale instance's local assertions.
local policyCount = 0
for id, bound in pairs(ledger.policies) do
  policyCount = policyCount + 1
  if policyCount > 32 or not hash(id) or type(bound) ~= 'table' or type(bound.approved) ~= 'boolean'
    or type(bound.model) ~= 'string' or #bound.model < 2 or #bound.model > 81 or not string.match(bound.model, '^[a-z][a-z0-9%.%-]+$')
    or type(bound.pricingVersion) ~= 'string' or #bound.pricingVersion < 1 or #bound.pricingVersion > 80 or not string.match(bound.pricingVersion, '^[%w%._%-]+$')
    or not integer(bound.reservationMicros, 1, LIMIT) or bound.maxOutputTokens ~= 700 or bound.maxToolCalls ~= 2
    or not integer(bound.validFromMs, 0, MAX_TIME - 1) or not integer(bound.validUntilMs, 1, MAX_TIME - 1) or bound.validFromMs >= bound.validUntilMs
    or type(bound.reference) ~= 'string' or #bound.reference > 1000 or not string.find(bound.reference, '%S') or string.find(bound.reference, '%c') then return 0 end
end
local storedStart, storedEnd = monthBounds(ledger.monthStartMs)
if storedStart ~= ledger.monthStartMs or storedEnd ~= ledger.monthEndMs or storedStart > monthStart then return 0 end
local entries, owned = 0, 0
for identity, value in pairs(ledger.leases) do
  entries = entries + 1
  if entries > MAX_REQUESTS * 2 or not hash(identity) or type(value) ~= 'table' or not hash(value.policy)
    or type(value.token) ~= 'string' or (#value.token ~= 36 and value.token ~= '')
    or not integer(value.expiresMs, 0, storedEnd) or not integer(value.cooldownUntilMs, storedStart, storedEnd + 86400000)
    or (value.token == '' and value.expiresMs ~= 0) then return 0 end
  if value.token ~= '' then owned = owned + 1 end
end
if owned > ledger.requestCount then return 0 end
-- Persist trusted time even for a denied lease/budget/policy check, so an expired
-- lease cannot revive after clock rollback. Denial never resets month or spending.
local originalLedger = ledger
originalLedger.lastSeenMs = now
local function deny()
  redis.call('SET', KEY, cjson.encode(originalLedger))
  return 0
end
local approved = ledger.policies[policy]
if pricesValidUntil <= now or not approved or approved.approved ~= true
  or approved.model ~= ARGV[10] or approved.pricingVersion ~= ARGV[11]
  or cost ~= approved.reservationMicros or now < approved.validFromMs or now >= approved.validUntilMs then return deny() end
if storedStart < monthStart then
  if op ~= 'reserve' then return deny() end
  -- A new UTC reservation month, not a refund. Prior-month ownership is invalid.
  -- Keep cooldowns across the boundary; no lease can straddle the month.
  local carried = {}
  for identity, value in pairs(ledger.leases) do
    if value.cooldownUntilMs > now then
      carried[identity] = {token = '', policy = value.policy, expiresMs = 0, cooldownUntilMs = value.cooldownUntilMs}
    end
  end
  ledger = {version = 2, limitMicros = LIMIT, monthStartMs = monthStart, monthEndMs = monthEnd,
    reservedMicros = 0, requestCount = 0, leases = carried, policies = ledger.policies, lastSeenMs = now}
end
local lease = ledger.leases[song]
if op == 'reserve' then
  if deadline <= now or deadline > now + leaseMs or deadline >= monthEnd or deadline >= pricesValidUntil or deadline >= approved.validUntilMs then return deny() end
  if lease and (lease.expiresMs > now or lease.cooldownUntilMs > now) then return deny() end
  if ledger.reservedMicros + cost > LIMIT or ledger.requestCount >= MAX_REQUESTS then return deny() end
  for identity, value in pairs(ledger.leases) do
    if value.expiresMs <= now and value.cooldownUntilMs <= now then ledger.leases[identity] = nil end
  end
  ledger.reservedMicros = ledger.reservedMicros + cost
  ledger.requestCount = ledger.requestCount + 1
  ledger.leases[song] = {token = token, policy = policy, expiresMs = deadline, cooldownUntilMs = now + cooldown}
elseif op == 'check' then
  if not lease or lease.token ~= token or lease.policy ~= policy or lease.expiresMs <= now
    or lease.expiresMs >= approved.validUntilMs or lease.expiresMs >= pricesValidUntil then return deny() end
else
  if not lease or lease.token ~= token or lease.policy ~= policy then return deny() end
  lease.expiresMs = 0
end
redis.call('SET', KEY, cjson.encode(ledger))
return 1
`;

const integer = (value: number, min: number, max: number) => Number.isSafeInteger(value) && value >= min && value <= max;
const reference = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 1000 && !/[\u0000-\u001f\u007f]/.test(value);

/** Strict, injectable command adapter. No default transport or credential lookup. */
export function createMonthlyRedisAtomicStore(
  command: (args: (string | number)[], signal: AbortSignal) => Promise<unknown>,
): MonthlyAtomicStore {
  return { eval: async (script, keys, args, signal) => {
    if (signal.aborted || script !== MONTHLY_BUDGET_SCRIPT || keys.length !== 1
      || keys[0] !== MONTHLY_LEDGER_KEY || args.length !== 12
      || !["reserve", "check", "finish"].includes(args[0])
      || args.some(value => typeof value !== "string" || value.length > 200)) {
      throw new Error("Monthly research budget unavailable");
    }
    return command(["EVAL", script, 1, MONTHLY_LEDGER_KEY, ...args], signal);
  } };
}

/**
 * Conservative nonrefundable reservations. Finishing only ends ownership; it never
 * subtracts money, even when no provider request was dispatched. A lost acknowledgment
 * cannot grant a permit. No fallback to the old daily gate or process-local accounting.
 */
export function createMonthlyBudgetGate(
  config: MonthlyBudgetConfig | null,
  store?: MonthlyAtomicStore,
  readServerTime: () => number = Date.now,
): NonNullable<Dependencies["approveShared"]> {
  const c = config ? Object.freeze({
    ...config,
    costBound: config.costBound ? Object.freeze({ ...config.costBound }) : undefined,
    durableStore: config.durableStore ? Object.freeze({ ...config.durableStore }) : undefined,
  }) : null;
  const valid = c?.enabled === true
    && /^[a-z][a-z0-9.-]{1,80}$/.test(c.model)
    && /^[a-zA-Z0-9._-]{1,80}$/.test(c.pricingVersion)
    && integer(c.reservationMicros, 1, MONTHLY_LIMIT_MICROS)
    && integer(c.cooldownMs, 10000, 86400000)
    && c.costBound?.verified === true
    && c.costBound.includesAllBillableInput === true
    && c.costBound.includesSearchContentInput === true
    && c.costBound.includesOutputAndReasoning === true
    && c.costBound.includesToolCharges === true
    && reference(c.costBound.reference)
    && integer(c.costBound.validUntilMs, 1, MAX_TIME - 1)
    && c.durableStore?.verified === true
    && c.durableStore.acknowledgedReservationsSurviveFailover === true
    && c.durableStore.noEviction === true
    && reference(c.durableStore.reference);
  const policy = c ? createHash("sha256").update(JSON.stringify(c)).digest("hex") : "";
  return async (request, signal): Promise<Permit | null> => {
    if (!valid || !c || !c.costBound || !store || signal.aborted || request.model !== c.model
      || request.maxOutputTokens !== 700 || request.maxToolCalls !== 2
      || !/^[a-f0-9]{64}$/.test(request.key)
      || !integer(request.leaseMs, 1, 10000)
      || !integer(request.deadlineMs, 1, MAX_TIME - 1)) return null;
    const token = randomUUID();
    const args = [policy, request.key, token, String(c.reservationMicros), String(c.cooldownMs),
      String(request.leaseMs), String(request.deadlineMs), String(c.costBound.validUntilMs), c.model, c.pricingVersion];
    const command = async (op: string, callSignal: AbortSignal): Promise<boolean> => {
      if (callSignal.aborted) return false;
      try {
        // Trusted application-server clock only, never browser/request data.
        const observedAt = readServerTime();
        if (!integer(observedAt, 1, MAX_TIME - 1) || callSignal.aborted) return false;
        const result = await store.eval(MONTHLY_BUDGET_SCRIPT, [MONTHLY_LEDGER_KEY], [op, ...args, String(observedAt)], callSignal);
        return !callSignal.aborted && result === 1;
      } catch { return false; }
    };
    if (!await command("reserve", signal)) return null;
    return {
      isValid: checkSignal => command("check", checkSignal),
      finish: async (_outcome, finishSignal) => { await command("finish", finishSignal); },
    };
  };
}
