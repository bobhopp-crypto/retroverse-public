import "server-only";

import { Pool, type PoolClient } from "pg";

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
const RELAY_TTL_SECONDS = 90;
const MAX_CATALOG_TRACKS = 10_000;
const MAX_SESSION_REQUESTS = 5_000;

let pool: Pool | null = null;

export class JukeboxRelayInputError extends Error {
  readonly code: "closed" | "invalid" | "limit" | "stale";

  constructor(code: JukeboxRelayInputError["code"], message: string) {
    super(message);
    this.name = "JukeboxRelayInputError";
    this.code = code;
  }
}

function relayPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.RETROVERSE_JUKEBOX_RELAY_DATABASE_URL?.trim();
  const host = process.env.RETROVERSE_JUKEBOX_RELAY_PG_HOST?.trim();
  const database = process.env.RETROVERSE_JUKEBOX_RELAY_PG_DATABASE?.trim();
  const user = process.env.RETROVERSE_JUKEBOX_RELAY_PG_USER?.trim();
  if (!connectionString && (!host || !database || !user)) {
    throw new Error("The public Jukebox relay database is not configured.");
  }
  const parsed = connectionString ? new URL(connectionString) : null;
  if (parsed && parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("The public Jukebox relay database URL is invalid.");
  }
  const resolvedHost = parsed?.hostname || host!;
  const local = resolvedHost === "localhost" || resolvedHost === "127.0.0.1" || resolvedHost === "::1";
  pool = new Pool({
    ...(connectionString
      ? { connectionString }
      : {
          host,
          port: Number(process.env.RETROVERSE_JUKEBOX_RELAY_PG_PORT?.trim() || "5432"),
          database,
          user,
          password: process.env.RETROVERSE_JUKEBOX_RELAY_PG_PASSWORD ?? "",
        }),
    ssl: local ? undefined : { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: "retroverse-jukebox-relay",
  });
  return pool;
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
    key: trackKey(input.key),
    artist: cleanText(input.artist, 240, "catalog artist"),
    title: cleanText(input.title, 240, "catalog title"),
    year,
    rvtr: input.rvtr && RVTR_RE.test(input.rvtr) ? input.rvtr : null,
    heroUrl,
  };
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await relayPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function loadPublicJukeboxRelayStatus(): Promise<PublicJukeboxRelayStatus> {
  const result = await relayPool().query<{
    session_token: string;
    is_open: boolean;
  }>(
    `SELECT session_token::text,
            (requests_enabled AND ended_at IS NULL AND expires_at > now()) AS is_open
       FROM retroverse_jukebox_relay_sessions
      WHERE is_current = true
      LIMIT 1`,
  );
  const row = result.rows[0];
  return { isOpen: row?.is_open === true, sessionToken: row?.session_token ?? null };
}

export async function loadPublicJukeboxRelayCatalog(input: {
  sessionToken: string;
  query?: string;
  limit?: number;
}): Promise<PublicJukeboxRelayCatalog> {
  const sessionToken = uuid(input.sessionToken, "session");
  const needle = (input.query ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80);
  const limit = Math.max(1, Math.min(60, Math.floor(input.limit ?? 60)));
  const session = await relayPool().query<{ request_limit: number | null }>(
    `SELECT request_limit
       FROM retroverse_jukebox_relay_sessions
      WHERE session_token = $1
        AND is_current = true
        AND requests_enabled = true
        AND ended_at IS NULL
        AND expires_at > now()`,
    [sessionToken],
  );
  if (!session.rows[0]) throw new JukeboxRelayInputError("closed", "Song requests are closed right now.");
  const [count, rows] = await Promise.all([
    relayPool().query<{ total: string }>(
      `SELECT count(*)::text AS total
         FROM retroverse_jukebox_relay_catalog
        WHERE session_token = $1
          AND ($2 = '' OR artist ILIKE '%' || $2 || '%' OR title ILIKE '%' || $2 || '%')`,
      [sessionToken, needle],
    ),
    relayPool().query<{
      track_key: string;
      artist: string;
      title: string;
      year: number | null;
      rvtr: string | null;
      hero_url: string | null;
    }>(
      `SELECT track_key, artist, title, year, rvtr, hero_url
         FROM retroverse_jukebox_relay_catalog
        WHERE session_token = $1
          AND ($2 = '' OR artist ILIKE '%' || $2 || '%' OR title ILIKE '%' || $2 || '%')
        ORDER BY position, artist, title
        LIMIT $3`,
      [sessionToken, needle, limit],
    ),
  ]);
  return {
    sessionToken,
    requestLimit: session.rows[0].request_limit,
    total: Number(count.rows[0]?.total ?? 0),
    tracks: rows.rows.map((row) => ({
      key: row.track_key,
      artist: row.artist,
      title: row.title,
      year: row.year,
      rvtr: row.rvtr,
      heroUrl: row.hero_url,
    })),
  };
}

export async function submitPublicJukeboxRelayRequest(input: {
  publicRequestId: string;
  sessionToken: string;
  guestId: string;
  nickname?: string | null;
  trackKey: string;
}): Promise<PublicJukeboxRelayReceipt> {
  const publicRequestId = uuid(input.publicRequestId, "request");
  const sessionToken = uuid(input.sessionToken, "session");
  const guestId = uuid(input.guestId, "guest");
  const requestedTrackKey = trackKey(input.trackKey);
  const guestNickname = nickname(input.nickname);

  return transaction(async (client) => {
    const session = await client.query<{
      request_limit: number | null;
      next_guest_number: string;
    }>(
      `SELECT request_limit, next_guest_number::text
         FROM retroverse_jukebox_relay_sessions
        WHERE session_token = $1
          AND is_current = true
          AND requests_enabled = true
          AND ended_at IS NULL
          AND expires_at > now()
        FOR UPDATE`,
      [sessionToken],
    );
    const active = session.rows[0];
    if (!active) throw new JukeboxRelayInputError("stale", "This event is no longer accepting requests.");

    const existing = await client.query<{
      session_token: string;
      guest_id: string;
      track_key: string;
      artist: string;
      title: string;
      year: number | null;
      status: string;
      result_detail: string | null;
      requested_at: Date;
    }>(
      `SELECT session_token::text, guest_id::text, track_key, artist, title, year,
              status, result_detail, requested_at
         FROM retroverse_jukebox_relay_requests
        WHERE public_request_id = $1`,
      [publicRequestId],
    );
    const prior = existing.rows[0];
    if (prior) {
      if (prior.session_token !== sessionToken || prior.guest_id !== guestId || prior.track_key !== requestedTrackKey) {
        throw new JukeboxRelayInputError("invalid", "That request ID is already in use.");
      }
      if (prior.status === "rejected") {
        throw new JukeboxRelayInputError("invalid", prior.result_detail || "That request was not accepted.");
      }
      return {
        publicRequestId,
        artist: prior.artist,
        title: prior.title,
        year: prior.year,
        requestedAt: prior.requested_at.toISOString(),
        duplicate: true,
      };
    }

    const track = await client.query<{
      artist: string;
      title: string;
      year: number | null;
    }>(
      `SELECT artist, title, year
         FROM retroverse_jukebox_relay_catalog
        WHERE session_token = $1 AND track_key = $2`,
      [sessionToken, requestedTrackKey],
    );
    const selected = track.rows[0];
    if (!selected) throw new JukeboxRelayInputError("stale", "That video is no longer available.");

    const guest = await client.query<{ guest_number: string; last_seen_at: Date }>(
      `SELECT guest_number::text, last_seen_at
         FROM retroverse_jukebox_relay_guests
        WHERE session_token = $1 AND guest_id = $2`,
      [sessionToken, guestId],
    );
    if (!guest.rows[0]) {
      await client.query(
        `INSERT INTO retroverse_jukebox_relay_guests
          (session_token, guest_id, guest_number, nickname)
         VALUES ($1, $2, $3, $4)`,
        [sessionToken, guestId, Number(active.next_guest_number), guestNickname],
      );
      await client.query(
        `UPDATE retroverse_jukebox_relay_sessions
            SET next_guest_number = next_guest_number + 1, updated_at = now()
          WHERE session_token = $1`,
        [sessionToken],
      );
    } else {
      if (Date.now() - guest.rows[0].last_seen_at.getTime() < 500) {
        throw new JukeboxRelayInputError("limit", "Please wait a moment before sending another request.");
      }
      await client.query(
        `UPDATE retroverse_jukebox_relay_guests
            SET nickname = $3, last_seen_at = now()
          WHERE session_token = $1 AND guest_id = $2`,
        [sessionToken, guestId, guestNickname],
      );
    }

    const counts = await client.query<{ guest_count: string; session_count: string }>(
      `SELECT
         count(*) FILTER (WHERE guest_id = $2 AND status <> 'rejected')::text AS guest_count,
         count(*) FILTER (WHERE status <> 'rejected')::text AS session_count
       FROM retroverse_jukebox_relay_requests
       WHERE session_token = $1`,
      [sessionToken, guestId],
    );
    const guestCount = Number(counts.rows[0]?.guest_count ?? 0);
    const sessionCount = Number(counts.rows[0]?.session_count ?? 0);
    if (active.request_limit != null && guestCount >= active.request_limit) {
      throw new JukeboxRelayInputError("limit", "You have reached the request limit for this event.");
    }
    if (sessionCount >= MAX_SESSION_REQUESTS) {
      throw new JukeboxRelayInputError("limit", "The request inbox is full right now.");
    }

    const inserted = await client.query<{ requested_at: Date }>(
      `INSERT INTO retroverse_jukebox_relay_requests
        (public_request_id, session_token, guest_id, track_key, artist, title, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING requested_at`,
      [publicRequestId, sessionToken, guestId, requestedTrackKey, selected.artist, selected.title, selected.year],
    );
    return {
      publicRequestId,
      artist: selected.artist,
      title: selected.title,
      year: selected.year,
      requestedAt: inserted.rows[0]!.requested_at.toISOString(),
      duplicate: false,
    };
  });
}

export async function applyPublicJukeboxRelayControl(
  input: PublicJukeboxRelayControl & { ended?: boolean },
): Promise<void> {
  const sessionToken = uuid(input.sessionToken, "session");
  const requestLimit = input.requestLimit == null ? null : Math.floor(Number(input.requestLimit));
  if (requestLimit != null && (!Number.isSafeInteger(requestLimit) || requestLimit < 1 || requestLimit > 99)) {
    throw new JukeboxRelayInputError("invalid", "Invalid request policy.");
  }
  const catalog = input.catalog == null ? null : input.catalog.map(normalizeTrack);
  if (catalog && catalog.length > MAX_CATALOG_TRACKS) {
    throw new JukeboxRelayInputError("invalid", "The public request catalog is too large.");
  }
  if (catalog && new Set(catalog.map((track) => track.key)).size !== catalog.length) {
    throw new JukeboxRelayInputError("invalid", "The public request catalog contains duplicate tracks.");
  }

  await transaction(async (client) => {
    await client.query(
      `UPDATE retroverse_jukebox_relay_sessions
          SET is_current = false, updated_at = now()
        WHERE is_current = true AND session_token <> $1`,
      [sessionToken],
    );
    await client.query(
      `INSERT INTO retroverse_jukebox_relay_sessions
        (session_token, is_current, requests_enabled, request_limit, catalog_count, expires_at, ended_at)
       VALUES ($1, true, $2, $3, COALESCE($4, 0),
               CASE WHEN $2 THEN now() + ($5::text || ' seconds')::interval ELSE now() END,
               CASE WHEN $6 THEN now() ELSE NULL END)
       ON CONFLICT (session_token) DO UPDATE SET
         is_current = true,
         requests_enabled = EXCLUDED.requests_enabled,
         request_limit = EXCLUDED.request_limit,
         catalog_count = COALESCE($4, retroverse_jukebox_relay_sessions.catalog_count),
         expires_at = EXCLUDED.expires_at,
         ended_at = CASE WHEN $6 THEN COALESCE(retroverse_jukebox_relay_sessions.ended_at, now()) ELSE NULL END,
         updated_at = now()`,
      [sessionToken, input.isOpen, requestLimit, catalog?.length ?? null, RELAY_TTL_SECONDS, input.ended === true],
    );

    if (catalog) {
      for (let offset = 0; offset < catalog.length; offset += 250) {
        const chunk = catalog.slice(offset, offset + 250);
        const values: unknown[] = [];
        const rows = chunk.map((track, index) => {
          const base = index * 8;
          values.push(sessionToken, track.key, track.artist, track.title, track.year, track.rvtr, track.heroUrl, offset + index);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
        });
        await client.query(
          `INSERT INTO retroverse_jukebox_relay_catalog
            (session_token, track_key, artist, title, year, rvtr, hero_url, position)
           VALUES ${rows.join(", ")}
           ON CONFLICT (session_token, track_key) DO UPDATE SET
             artist = EXCLUDED.artist,
             title = EXCLUDED.title,
             year = EXCLUDED.year,
             rvtr = EXCLUDED.rvtr,
             hero_url = EXCLUDED.hero_url,
             position = EXCLUDED.position`,
          values,
        );
      }
    }
  });
}

export async function pollPublicJukeboxRelayInbox(
  sessionTokenInput: string,
): Promise<PublicJukeboxRelayRequest[]> {
  const sessionToken = uuid(sessionTokenInput, "session");
  const touched = await relayPool().query(
    `UPDATE retroverse_jukebox_relay_sessions
        SET expires_at = now() + ($2::text || ' seconds')::interval, updated_at = now()
      WHERE session_token = $1
        AND is_current = true
        AND requests_enabled = true
        AND ended_at IS NULL`,
    [sessionToken, RELAY_TTL_SECONDS],
  );
  if ((touched.rowCount ?? 0) === 0) return [];
  const result = await relayPool().query<{
    public_request_id: string;
    session_token: string;
    guest_id: string;
    nickname: string | null;
    track_key: string;
    artist: string;
    title: string;
    year: number | null;
    requested_at: Date;
  }>(
    `SELECT r.public_request_id::text, r.session_token::text, r.guest_id::text,
            g.nickname, r.track_key, r.artist, r.title, r.year, r.requested_at
       FROM retroverse_jukebox_relay_requests r
       JOIN retroverse_jukebox_relay_guests g
         ON g.session_token = r.session_token AND g.guest_id = r.guest_id
      WHERE r.session_token = $1 AND r.status = 'pending'
      ORDER BY r.requested_at, r.public_request_id
      LIMIT 250`,
    [sessionToken],
  );
  return result.rows.map((row) => ({
    publicRequestId: row.public_request_id,
    sessionToken: row.session_token,
    guestId: row.guest_id,
    nickname: row.nickname,
    trackKey: row.track_key,
    artist: row.artist,
    title: row.title,
    year: row.year,
    requestedAt: row.requested_at.toISOString(),
  }));
}

export async function acknowledgePublicJukeboxRelayRequests(input: {
  sessionToken: string;
  acknowledgements: PublicJukeboxRelayAck[];
}): Promise<void> {
  const sessionToken = uuid(input.sessionToken, "session");
  if (input.acknowledgements.length > 250) throw new JukeboxRelayInputError("invalid", "Too many acknowledgements.");
  await transaction(async (client) => {
    for (const acknowledgement of input.acknowledgements) {
      if (acknowledgement.result !== "delivered" && acknowledgement.result !== "rejected") {
        throw new JukeboxRelayInputError("invalid", "Invalid acknowledgement result.");
      }
      const publicRequestId = uuid(acknowledgement.publicRequestId, "request");
      const detail = acknowledgement.detail?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240) || null;
      const localRequestId = acknowledgement.localRequestId == null
        ? null
        : Math.floor(Number(acknowledgement.localRequestId));
      await client.query(
        `UPDATE retroverse_jukebox_relay_requests
            SET status = $3::varchar,
                local_request_id = $4::bigint,
                result_detail = $5::varchar,
                delivered_at = CASE WHEN $3::varchar = 'delivered' THEN now() ELSE delivered_at END,
                updated_at = now()
          WHERE public_request_id = $1
            AND session_token = $2
            AND status = 'pending'`,
        [publicRequestId, sessionToken, acknowledgement.result, localRequestId, detail],
      );
    }
  });
}
