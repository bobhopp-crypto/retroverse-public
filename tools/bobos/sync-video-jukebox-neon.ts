import { Pool, type PoolClient } from "pg";

import {
  mutateJukeboxLocalState,
  readJukeboxLocalState,
  type LocalJukeboxRequest,
} from "../../packages/shared/lib/song-requests/jukebox-local-state";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function syncRequest(client: PoolClient, request: LocalJukeboxRequest): Promise<number> {
  if (request.neonRequestId != null) {
    await client.query(
      `
        UPDATE retroverse_song_requests
        SET local_request_id = COALESCE(local_request_id, $2)
        WHERE id = $1 AND jukebox_session_id = $3
      `,
      [request.neonRequestId, request.syncId, request.jukeboxSessionId],
    );
  }
  const result = await client.query<{ id: number }>(
    `
      INSERT INTO retroverse_song_requests (
        local_request_id, event_id, visitor_id, pass_serial, requester_session_id,
        jukebox_session_id, catalog_track_id, rvtr, virtualdj_track_identity,
        artist, title, year, source_path_snapshot, selected_source_label,
        source_relative_path, guest_comment, status, dj_response, requested_at,
        accepted_at, played_at, skipped_at, responded_at, updated_at
      ) VALUES (
        $1, $2, NULL, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      ON CONFLICT (local_request_id) WHERE local_request_id IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status,
          dj_response = EXCLUDED.dj_response,
          accepted_at = EXCLUDED.accepted_at,
          played_at = EXCLUDED.played_at,
          skipped_at = EXCLUDED.skipped_at,
          responded_at = EXCLUDED.responded_at,
          updated_at = EXCLUDED.updated_at
      RETURNING id
    `,
    [
      request.syncId,
      request.eventId,
      request.requesterSessionId,
      request.jukeboxSessionId,
      request.catalogTrackId,
      request.rvtr,
      request.virtualDjTrackIdentity,
      request.artist,
      request.title,
      request.year,
      request.localMediaPath,
      request.selectedSourceLabel,
      request.sourceRelativePath,
      request.guestComment,
      request.status,
      request.djResponse,
      request.requestedAt,
      request.acceptedAt,
      request.playedAt,
      request.skippedAt,
      request.respondedAt,
      request.updatedAt,
    ],
  );
  return Number(result.rows[0]!.id);
}

async function main() {
  const attemptAt = new Date().toISOString();
  await mutateJukeboxLocalState((state) => {
    state.sync.lastAttemptAt = attemptAt;
    state.sync.lastError = null;
  });
  const state = await readJukeboxLocalState();
  if (!state.catalog) throw new Error("The local Jukebox catalog is not initialized.");

  const pool = new Pool({
    host: required("RETROVERSE_PASS_PG_HOST"),
    port: Number(process.env.RETROVERSE_PASS_PG_PORT ?? 5432),
    database: required("RETROVERSE_PASS_PG_DATABASE"),
    user: required("RETROVERSE_PASS_PG_USER"),
    password: required("RETROVERSE_PASS_PG_PASSWORD"),
    ssl: process.env.RETROVERSE_PASS_PG_SSL === "0" ? undefined : { rejectUnauthorized: false },
    max: 1,
  });

  const syncedRequestIds = new Map<string, number>();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const catalogCheck = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM retroverse_request_catalog_tracks WHERE event_id = $1`,
      [state.catalog.eventId],
    );
    if (Number(catalogCheck.rows[0]?.count ?? 0) < state.catalog.tracks.length) {
      throw new Error("Neon does not contain the local Jukebox catalog snapshot; sync stopped safely.");
    }

    for (const session of state.sessions) {
      await client.query(
        `
          INSERT INTO retroverse_jukebox_sessions (
            session_id, catalog_event_id, display_name, session_date, status,
            request_limit, started_at, ended_at, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$7,$9)
          ON CONFLICT (session_id) DO UPDATE
          SET display_name = EXCLUDED.display_name,
              status = EXCLUDED.status,
              request_limit = EXCLUDED.request_limit,
              ended_at = EXCLUDED.ended_at,
              updated_at = EXCLUDED.updated_at
        `,
        [
          session.sessionId,
          session.catalogEventId,
          session.name,
          session.sessionDate,
          session.status,
          session.requestLimit,
          session.startedAt,
          session.endedAt,
          session.updatedAt,
        ],
      );
    }

    for (const guest of state.guests) {
      await client.query(
        `
          INSERT INTO retroverse_requester_sessions (
            session_id, event_id, jukebox_session_id, guest_number, nickname,
            started_at, last_seen_at, ended_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (session_id) DO UPDATE
          SET last_seen_at = EXCLUDED.last_seen_at,
              ended_at = EXCLUDED.ended_at
        `,
        [
          guest.sessionId,
          guest.eventId,
          guest.jukeboxSessionId,
          guest.guestNumber,
          guest.nickname,
          guest.startedAt,
          guest.lastSeenAt,
          guest.endedAt,
        ],
      );
    }

    for (const request of state.requests) {
      syncedRequestIds.set(request.syncId, await syncRequest(client, request));
    }

    const isOpen = state.sessions.some((session) => session.status === "active" && session.endedAt == null);
    await client.query(
      `
        INSERT INTO retroverse_jukebox_settings (event_id, is_open, request_limit, updated_at)
        VALUES ($1,$2,$3,now())
        ON CONFLICT (event_id) DO UPDATE
        SET is_open = EXCLUDED.is_open,
            request_limit = EXCLUDED.request_limit,
            updated_at = now()
      `,
      [state.catalog.eventId, isOpen, state.defaultRequestLimit],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    await mutateJukeboxLocalState((current) => {
      current.sync.lastError = message.slice(0, 500);
    });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  const successAt = new Date().toISOString();
  await mutateJukeboxLocalState((current) => {
    for (const request of current.requests) {
      const neonRequestId = syncedRequestIds.get(request.syncId);
      if (neonRequestId != null) request.neonRequestId = neonRequestId;
    }
    current.sync.lastSuccessAt = successAt;
    current.sync.lastError = null;
  });
  console.log(JSON.stringify({
    optionalSync: "complete",
    sessions: state.sessions.length,
    guests: state.guests.length,
    requests: state.requests.length,
    syncedAt: successAt,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
