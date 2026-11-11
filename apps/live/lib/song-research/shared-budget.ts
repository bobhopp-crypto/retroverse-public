import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Dependencies, Permit } from "./openai-adapter";

/** UTC daily, integer USD micro-unit ledger. All reservations are charged,
 * including never-dispatched/unknown outcomes. No retry/refund path exists.
 * Supply an independently reviewed conservative per-response upper bound covering
 * input/search content/output tokens AND tool charges for this exact model/limits.
 * This gate cannot derive a safe price from a subscription or token limit alone.
 */
export type BudgetConfig = {
  enabled: boolean; scope: string; model: string; pricingVersion: string;
  dailyLimitMicros: number; reservationMicros: number; dailyRequestLimit: number;
  cooldownMs: number;
  // Trusted operator assertion supported by model/provider documentation, not an
  // estimate inferred from output/tool caps. Missing/unverified => disabled gate.
  costBound: { verified: true; includesSearchContentInput: true; reference: string };
};
export type AtomicStore = {
  // Must execute EVAL atomically on one durable shared Redis primary, honor abort,
  // and NEVER retry uncertain operations. No eventually-consistent/local fallback.
  eval(script: string, keys: string[], args: string[], signal: AbortSignal): Promise<unknown>;
};
/** Redis REST command format matches existing redis-live-state.ts. Inject an
 * approved abort-aware command transport; do not use that module's GET/SET test
 * map or wrap GET+SET as a transaction. No transport/config is chosen here.
 */
export function createRedisAtomicStore(command: (args: (string | number)[], signal: AbortSignal) => Promise<unknown>): AtomicStore {
  return { eval: async (script, keys, args, signal) => {
    if (signal.aborted || keys.length !== 1 || script !== BUDGET_SCRIPT) throw new Error("Research budget unavailable");
    return command(["EVAL",script,keys.length,...keys,...args],signal);
  } };
}
// One ledger key prevents cross-slot transactions. Redis TIME, not browser/local
// clock, owns the day and lease expiry. A lease cannot cross UTC midnight.
export const BUDGET_SCRIPT = `
local nowParts = redis.call('TIME')
local now = tonumber(nowParts[1])*1000 + math.floor(tonumber(nowParts[2])/1000)
local day = math.floor(now/86400000)
local op, policy, song, token = ARGV[1], ARGV[2], ARGV[3], ARGV[4]
local limit, cost, countLimit = tonumber(ARGV[5]), tonumber(ARGV[6]), tonumber(ARGV[7])
local cooldown, leaseMs, deadline = tonumber(ARGV[8]), tonumber(ARGV[9]), tonumber(ARGV[10])
local raw = redis.call('GET',KEYS[1])
local ledger
if raw then
  ledger = cjson.decode(raw)
  if type(ledger) ~= 'table' or type(ledger.day) ~= 'number' or type(ledger.spent) ~= 'number' or type(ledger.count) ~= 'number' or type(ledger.leases) ~= 'table' or type(ledger.policy) ~= 'string' or ledger.spent < 0 or ledger.count < 0 then return 0 end
  if ledger.day > day then return 0 end
end
if not ledger or ledger.day < day then
  if op ~= 'reserve' then return 0 end
  -- Reset accounting, not anti-duplication. Carry unexpired cooldowns forward
  -- while invalidating all prior-day ownership/leases, even after policy change.
  local carried = {}
  if ledger then
    for k,v in pairs(ledger.leases) do
      if v.cooldown > now then carried[k] = {token='',expires=0,cooldown=v.cooldown} end
    end
  end
  ledger = {day=day,spent=0,count=0,policy=policy,leases=carried}
end
if ledger.policy ~= policy then return 0 end
local lease = ledger.leases[song]
if op == 'reserve' then
  if leaseMs <= 0 or leaseMs > 10000 or deadline <= now or deadline >= (day+1)*86400000 then return 0 end
  if lease and (lease.expires > now or lease.cooldown > now) then return 0 end
  if ledger.spent + cost > limit or ledger.count + 1 > countLimit then return 0 end
  -- Only counters and hashed identities/tokens; no songs/prompts/provider content.
  for k,v in pairs(ledger.leases) do if v.expires <= now and v.cooldown <= now then ledger.leases[k]=nil end end
  ledger.spent = ledger.spent + cost
  ledger.count = ledger.count + 1
  ledger.leases[song] = {token=token,expires=math.min(now+leaseMs,deadline),cooldown=now+cooldown}
elseif op == 'check' then
  if lease and lease.token == token and lease.expires > now then return 1 end
  return 0
elseif op == 'finish' then
  if not lease or lease.token ~= token then return 0 end
  lease.expires = 0
else return 0 end
redis.call('SET',KEYS[1],cjson.encode(ledger),'PX',259200000)
return 1
`;
const integer = (v: number, min: number, max: number) => Number.isSafeInteger(v) && v >= min && v <= max;
export function createSharedBudgetGate(config: BudgetConfig | null, store?: AtomicStore): NonNullable<Dependencies["approveShared"]> {
  const c = config ? Object.freeze({ ...config, costBound: config.costBound ? Object.freeze({ ...config.costBound }) : undefined }) : null;
  const valid = c?.enabled === true && /^[a-z0-9-]{1,60}$/.test(c.scope) && /^[a-z][a-z0-9.-]{1,80}$/.test(c.model) && /^[a-zA-Z0-9._-]{1,80}$/.test(c.pricingVersion)
    && c.costBound?.verified === true && c.costBound.includesSearchContentInput === true && typeof c.costBound.reference === "string" && c.costBound.reference.length > 0 && c.costBound.reference.length <= 1000
    && integer(c.dailyLimitMicros,1,1e12) && integer(c.reservationMicros,1,c.dailyLimitMicros) && integer(c.dailyRequestLimit,1,10000) && integer(c.cooldownMs,10000,86400000);
  const policy = c ? createHash("sha256").update(JSON.stringify(c)).digest("hex") : "";
  return async (request, signal): Promise<Permit | null> => {
    if (!valid || !c || !store || signal.aborted || request.model !== c.model || request.maxOutputTokens !== 700 || request.maxToolCalls !== 2 || !/^[a-f0-9]{64}$/.test(request.key) || !integer(request.leaseMs,1,10000) || !Number.isSafeInteger(request.deadlineMs)) return null;
    const token = randomUUID(), key = `rv:research:budget:{${c.scope}}:v1`;
    const command = async (op: string, callSignal: AbortSignal) => {
      if (callSignal.aborted) return false;
      try {
        const result = await store.eval(BUDGET_SCRIPT,[key],[op,policy,request.key,token,String(c.dailyLimitMicros),String(c.reservationMicros),String(c.dailyRequestLimit),String(c.cooldownMs),String(request.leaseMs),String(request.deadlineMs)],callSignal);
        return !callSignal.aborted && result === 1;
      } catch { return false; } // Uncertain commit stays charged; never auto-retry.
    };
    if (!await command("reserve",signal)) return null;
    return { isValid: s => command("check",s), finish: async (_outcome,s) => { await command("finish",s); } };
  };
}
