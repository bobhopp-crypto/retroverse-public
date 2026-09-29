import "server-only";

import { randomUUID } from "node:crypto";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import type {
  PublicJukeboxRelayAck,
  PublicJukeboxRelayCatalog,
  PublicJukeboxRelayControl,
  PublicJukeboxRelayReceipt,
  PublicJukeboxRelayRequest,
  PublicJukeboxRelayStatus,
  PublicJukeboxRelayTrack,
} from "./jukebox-relay-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACK_KEY_RE = /^[0-9a-f-]{20,64}$/i;
const RVTR_RE = /^RVTR\d{6}$/;
const RELAY_TTL_MS = 90_000;
const KEY_TTL_SECONDS = 7 * 24 * 3600;
const MAX_CATALOG_TRACKS = 10_000;
const MAX_SESSION_REQUESTS = 5_000;
const CURRENT_KEY = "rv:relay:current:v1";

export class JukeboxRelayInputError extends Error {
  readonly code: "closed" | "invalid" | "limit" | "stale";
  constructor(code: JukeboxRelayInputError["code"], message: string) {
    super(message);
    this.name = "JukeboxRelayInputError";
    this.code = code;
  }
}

type RelaySession = {
  sessionToken: string;
  isOpen: boolean;
  requestLimit: number | null;
  catalogKey: string | null;
  tracksKey: string | null;
  expiresAt: number;
  endedAt: string | null;
};
type RelayRequestRecord = PublicJukeboxRelayRequest & {
  status: "pending" | "delivered" | "rejected";
  resultDetail: string | null;
  localRequestId: number | null;
  deliveredAt: string | null;
};

function sessionKey(token: string): string { return `rv:relay:session:${token}`; }
function requestsKey(token: string): string { return `rv:relay:requests:${token}`; }
function guestsKey(token: string): string { return `rv:relay:guests:${token}`; }
function pendingKey(token: string): string { return `rv:relay:pending:${token}`; }
function countKey(token: string): string { return `rv:relay:count:${token}`; }
function decode<T>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value) as T; } catch { throw new Error("The request relay contains an invalid record."); }
}
async function readSession(token: string): Promise<RelaySession | null> {
  return decode<RelaySession>(await redisCommand(["GET", sessionKey(token)]));
}
function isActive(session: RelaySession | null): session is RelaySession {
  return !!session && session.isOpen && !session.endedAt && session.expiresAt > Date.now();
}
function uuid(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_RE.test(normalized)) throw new JukeboxRelayInputError("invalid", `Invalid ${label}.`);
  return normalized;
}
function trackKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!TRACK_KEY_RE.test(normalized)) throw new JukeboxRelayInputError("invalid", "Choose a video from this event.");
  return normalized;
}
function cleanText(value: string, max: number, label: string): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > max) throw new JukeboxRelayInputError("invalid", `Invalid ${label}.`);
  return normalized;
}
function nickname(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length > 32) throw new JukeboxRelayInputError("invalid", "Use a nickname with 32 characters or fewer.");
  return normalized;
}
function normalizeTrack(input: PublicJukeboxRelayTrack): PublicJukeboxRelayTrack {
  const heroUrl = input.heroUrl?.trim() || null;
  if (heroUrl && (!heroUrl.startsWith("/") || heroUrl.startsWith("//") || heroUrl.length > 320)) {
    throw new JukeboxRelayInputError("invalid", "Invalid catalog artwork URL.");
  }
  const year = input.year == null ? null : Math.floor(Number(input.year));
  if (year != null && (!Number.isFinite(year) || year < 1900 || year > 2100)) {
    throw new JukeboxRelayInputError("invalid", "Invalid catalog year.");
  }
  return {
    key: trackKey(input.key), artist: cleanText(input.artist, 240, "catalog artist"),
    title: cleanText(input.title, 240, "catalog title"), year,
    rvtr: input.rvtr && RVTR_RE.test(input.rvtr) ? input.rvtr : null, heroUrl,
  };
}

export async function loadPublicJukeboxRelayStatus(): Promise<PublicJukeboxRelayStatus> {
  const current = await redisCommand(["GET", CURRENT_KEY]);
  if (typeof current !== "string") return { isOpen: false, sessionToken: null };
  const session = await readSession(current);
  return { isOpen: isActive(session), sessionToken: current };
}

export async function loadPublicJukeboxRelayCatalog(input: {
  sessionToken: string; query?: string; limit?: number;
}): Promise<PublicJukeboxRelayCatalog> {
  const token = uuid(input.sessionToken, "session");
  const [current, session] = await Promise.all([redisCommand(["GET", CURRENT_KEY]), readSession(token)]);
  if (current !== token || !isActive(session)) {
    throw new JukeboxRelayInputError("closed", "Song requests are closed right now.");
  }
  const catalog = session.catalogKey
    ? decode<PublicJukeboxRelayTrack[]>(await redisCommand(["GET", session.catalogKey])) ?? []
    : [];
  const needle = (input.query ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80).toLowerCase();
  const limit = Math.max(1, Math.min(60, Math.floor(input.limit ?? 60)));
  const filtered = needle ? catalog.filter((track) => `${track.artist} ${track.title}`.toLowerCase().includes(needle)) : catalog;
  return { sessionToken: token, requestLimit: session.requestLimit, total: filtered.length, tracks: filtered.slice(0, limit) };
}

const SUBMIT_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current ~= ARGV[1] then return cjson.encode({code='stale', error='This event is no longer accepting requests.'}) end
local rawSession = redis.call('GET', KEYS[2])
if not rawSession then return cjson.encode({code='stale', error='This event is no longer accepting requests.'}) end
local session = cjson.decode(rawSession)
if not session.isOpen or session.endedAt ~= cjson.null or tonumber(session.expiresAt) <= tonumber(ARGV[7]) then
  return cjson.encode({code='stale', error='This event is no longer accepting requests.'})
end
local old = redis.call('HGET', KEYS[4], ARGV[2])
if old then
  local prior = cjson.decode(old)
  if prior.sessionToken ~= ARGV[1] or prior.guestId ~= ARGV[3] or prior.trackKey ~= ARGV[5] then
    return cjson.encode({code='invalid', error='That request ID is already in use.'})
  end
  if prior.status == 'rejected' then
    return cjson.encode({code='invalid', error=prior.resultDetail or 'That request was not accepted.'})
  end
  return cjson.encode({publicRequestId=ARGV[2], artist=prior.artist, title=prior.title,
    year=prior.year, requestedAt=prior.requestedAt, duplicate=true})
end
local rawTrack = redis.call('HGET', KEYS[3], ARGV[5])
if not rawTrack then return cjson.encode({code='stale', error='That video is no longer available.'}) end
local track = cjson.decode(rawTrack)
local rawGuest = redis.call('HGET', KEYS[5], ARGV[3])
local guest = rawGuest and cjson.decode(rawGuest) or {count=0, lastSeenAt=0}
if rawGuest and tonumber(ARGV[7]) - tonumber(guest.lastSeenAt) < 500 then
  return cjson.encode({code='limit', error='Please wait a moment before sending another request.'})
end
if session.requestLimit ~= cjson.null and tonumber(guest.count) >= tonumber(session.requestLimit) then
  return cjson.encode({code='limit', error='You have reached the request limit for this event.'})
end
local total = tonumber(redis.call('GET', KEYS[7]) or '0')
if total >= tonumber(ARGV[8]) then return cjson.encode({code='limit', error='The request inbox is full right now.'}) end
guest.count = tonumber(guest.count) + 1
guest.lastSeenAt = tonumber(ARGV[7])
guest.nickname = ARGV[4] ~= '' and ARGV[4] or cjson.null
redis.call('HSET', KEYS[5], ARGV[3], cjson.encode(guest))
local request = {publicRequestId=ARGV[2], sessionToken=ARGV[1], guestId=ARGV[3],
  nickname=guest.nickname, trackKey=ARGV[5], artist=track.artist, title=track.title,
  year=track.year, requestedAt=ARGV[6], status='pending',
  resultDetail=cjson.null, localRequestId=cjson.null, deliveredAt=cjson.null}
redis.call('HSET', KEYS[4], ARGV[2], cjson.encode(request))
redis.call('ZADD', KEYS[6], tonumber(ARGV[7]), ARGV[2])
redis.call('INCR', KEYS[7])
return cjson.encode({publicRequestId=ARGV[2], artist=track.artist, title=track.title,
  year=track.year, requestedAt=ARGV[6], duplicate=false})
`;

export async function submitPublicJukeboxRelayRequest(input: {
  publicRequestId: string; sessionToken: string; guestId: string; nickname?: string | null; trackKey: string;
}): Promise<PublicJukeboxRelayReceipt> {
  const id = uuid(input.publicRequestId, "request");
  const token = uuid(input.sessionToken, "session");
  const guest = uuid(input.guestId, "guest");
  const selected = trackKey(input.trackKey);
  const guestNickname = nickname(input.nickname);
  const session = await readSession(token);
  if (!session?.tracksKey) throw new JukeboxRelayInputError("stale", "This event is no longer accepting requests.");
  const now = new Date();
  const raw = await redisCommand(["EVAL", SUBMIT_SCRIPT, 7,
    CURRENT_KEY, sessionKey(token), session.tracksKey, requestsKey(token), guestsKey(token), pendingKey(token), countKey(token),
    token, id, guest, guestNickname ?? "", selected, now.toISOString(), now.getTime(), MAX_SESSION_REQUESTS]);
  const result = decode<PublicJukeboxRelayReceipt & { code?: JukeboxRelayInputError["code"]; error?: string }>(raw);
  if (!result) throw new Error("The request relay did not acknowledge the request.");
  if (result.code && result.error) throw new JukeboxRelayInputError(result.code, result.error);
  return result;
}

export async function applyPublicJukeboxRelayControl(input: PublicJukeboxRelayControl & { ended?: boolean }): Promise<void> {
  const token = uuid(input.sessionToken, "session");
  const requestLimit = input.requestLimit == null ? null : Math.floor(Number(input.requestLimit));
  if (requestLimit != null && (!Number.isSafeInteger(requestLimit) || requestLimit < 1 || requestLimit > 99)) {
    throw new JukeboxRelayInputError("invalid", "Invalid request policy.");
  }
  const catalog = input.catalog == null ? null : input.catalog.map(normalizeTrack);
  if (catalog && catalog.length > MAX_CATALOG_TRACKS) throw new JukeboxRelayInputError("invalid", "The public request catalog is too large.");
  if (catalog && new Set(catalog.map((track) => track.key)).size !== catalog.length) {
    throw new JukeboxRelayInputError("invalid", "The public request catalog contains duplicate tracks.");
  }
  const old = await readSession(token);
  let catalogKey = old?.catalogKey ?? null;
  let tracksKey = old?.tracksKey ?? null;
  if (catalog) {
    const version = randomUUID();
    catalogKey = `rv:relay:catalog:${token}:${version}`;
    tracksKey = `rv:relay:tracks:${token}:${version}`;
    if (await redisCommand(["SET", catalogKey, JSON.stringify(catalog), "EX", KEY_TTL_SECONDS]) !== "OK") {
      throw new Error("The request catalog was not saved.");
    }
    for (let offset = 0; offset < catalog.length; offset += 250) {
      const chunk = catalog.slice(offset, offset + 250);
      const args: (string | number)[] = ["HSET", tracksKey];
      for (const track of chunk) args.push(track.key, JSON.stringify(track));
      await redisCommand(args);
    }
    if (catalog.length) await redisCommand(["EXPIRE", tracksKey, KEY_TTL_SECONDS]);
  }
  const session: RelaySession = {
    sessionToken: token, isOpen: input.isOpen, requestLimit, catalogKey, tracksKey,
    expiresAt: input.isOpen ? Date.now() + RELAY_TTL_MS : Date.now(),
    endedAt: input.ended ? old?.endedAt ?? new Date().toISOString() : null,
  };
  if (await redisCommand(["SET", sessionKey(token), JSON.stringify(session), "EX", KEY_TTL_SECONDS]) !== "OK") {
    throw new Error("The request session was not saved.");
  }
  await redisCommand(["SET", CURRENT_KEY, token]);
}

export async function pollPublicJukeboxRelayInbox(sessionTokenInput: string): Promise<PublicJukeboxRelayRequest[]> {
  const token = uuid(sessionTokenInput, "session");
  const [current, session] = await Promise.all([redisCommand(["GET", CURRENT_KEY]), readSession(token)]);
  if (current !== token || !session?.isOpen || session.endedAt) return [];
  session.expiresAt = Date.now() + RELAY_TTL_MS;
  await redisCommand(["SET", sessionKey(token), JSON.stringify(session), "EX", KEY_TTL_SECONDS]);
  const ids = await redisCommand(["ZRANGE", pendingKey(token), 0, 249]);
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const records = await redisCommand(["HMGET", requestsKey(token), ...ids.map(String)]);
  if (!Array.isArray(records)) return [];
  return records.map((raw) => decode<RelayRequestRecord>(raw))
    .filter((record): record is RelayRequestRecord => !!record && record.status === "pending")
    .map(({ publicRequestId, sessionToken, guestId, nickname, trackKey, artist, title, year, requestedAt }) => ({
      publicRequestId, sessionToken, guestId, nickname, trackKey, artist, title, year, requestedAt,
    }));
}

export async function acknowledgePublicJukeboxRelayRequests(input: {
  sessionToken: string; acknowledgements: PublicJukeboxRelayAck[];
}): Promise<void> {
  const token = uuid(input.sessionToken, "session");
  if (input.acknowledgements.length > 250) throw new JukeboxRelayInputError("invalid", "Too many acknowledgements.");
  for (const acknowledgement of input.acknowledgements) {
    if (acknowledgement.result !== "delivered" && acknowledgement.result !== "rejected") {
      throw new JukeboxRelayInputError("invalid", "Invalid acknowledgement result.");
    }
    const id = uuid(acknowledgement.publicRequestId, "request");
    const record = decode<RelayRequestRecord>(await redisCommand(["HGET", requestsKey(token), id]));
    if (!record || record.sessionToken !== token || record.status !== "pending") continue;
    record.status = acknowledgement.result;
    record.localRequestId = acknowledgement.localRequestId == null ? null : Math.floor(Number(acknowledgement.localRequestId));
    record.resultDetail = acknowledgement.detail?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240) || null;
    record.deliveredAt = acknowledgement.result === "delivered" ? new Date().toISOString() : null;
    await redisCommand(["HSET", requestsKey(token), id, JSON.stringify(record)]);
    await redisCommand(["ZREM", pendingKey(token), id]);
  }
}
