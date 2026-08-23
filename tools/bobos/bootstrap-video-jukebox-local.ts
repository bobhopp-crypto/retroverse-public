import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";

import { Pool } from "pg";

import {
  JUKEBOX_LOCAL_STATE_VERSION,
  jukeboxLocalStatePath,
  replaceJukeboxLocalState,
  type LocalJukeboxState,
} from "../../packages/shared/lib/song-requests/jukebox-local-state";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function main() {
  const target = jukeboxLocalStatePath();
  const exists = await access(target).then(() => true).catch(() => false);
  if (exists && !process.argv.includes("--force")) {
    throw new Error(`Local jukebox state already exists at ${target}. Refusing to overwrite it.`);
  }

  const pool = new Pool({
    host: required("RETROVERSE_PASS_PG_HOST"),
    port: Number(process.env.RETROVERSE_PASS_PG_PORT ?? 5432),
    database: required("RETROVERSE_PASS_PG_DATABASE"),
    user: required("RETROVERSE_PASS_PG_USER"),
    password: required("RETROVERSE_PASS_PG_PASSWORD"),
    ssl: process.env.RETROVERSE_PASS_PG_SSL === "0" ? undefined : { rejectUnauthorized: false },
    max: 1,
  });

  try {
    const catalogResult = await pool.query<{
      event_id: string;
      title: string;
      source_id: number;
      source_kind: "folder" | "list" | "playlist";
      source_key: string | null;
      source_label: string;
      activated_at: Date | string;
    }>(`
      SELECT e.event_id, e.title, s.id AS source_id, s.source_kind, s.source_key,
             s.source_label, s.activated_at
      FROM retroverse_request_events e
      JOIN LATERAL (
        SELECT id, source_kind, source_key, source_label, activated_at
        FROM retroverse_request_sources
        WHERE event_id = e.event_id AND deactivated_at IS NULL
        ORDER BY activated_at DESC
        LIMIT 1
      ) s ON true
      WHERE e.is_active = true
      ORDER BY e.activated_at DESC
      LIMIT 1
    `);
    const catalog = catalogResult.rows[0];
    if (!catalog) throw new Error("No active request catalog is available to snapshot.");

    const [trackResult, sessionResult, guestResult, requestResult, settingsResult, maxIdResult] = await Promise.all([
      pool.query<{
        id: number;
        public_key: string;
        rvtr: string | null;
        virtualdj_track_identity: string;
        artist: string;
        title: string;
        year: number | null;
        source_path_snapshot: string;
        selected_source_label: string;
        source_relative_path: string | null;
      }>(`
        SELECT id, public_key, rvtr, virtualdj_track_identity, artist, title, year,
               source_path_snapshot, selected_source_label, source_relative_path
        FROM retroverse_request_catalog_tracks
        WHERE source_id = $1
        ORDER BY id
      `, [catalog.source_id]),
      pool.query<{
        session_id: string;
        catalog_event_id: string;
        display_name: string;
        session_date: string;
        status: "active" | "ended";
        request_limit: number | null;
        started_at: Date | string;
        ended_at: Date | string | null;
        updated_at: Date | string;
      }>(`
        SELECT session_id, catalog_event_id, display_name,
               to_char(session_date, 'YYYY-MM-DD') AS session_date,
               status, request_limit, started_at, ended_at, updated_at
        FROM retroverse_jukebox_sessions
        ORDER BY started_at
      `),
      pool.query<{
        session_id: string;
        event_id: string;
        jukebox_session_id: string;
        guest_number: number;
        nickname: string | null;
        started_at: Date | string;
        last_seen_at: Date | string;
        ended_at: Date | string | null;
      }>(`
        SELECT session_id, event_id, jukebox_session_id, guest_number, nickname,
               started_at, last_seen_at, ended_at
        FROM retroverse_requester_sessions
        WHERE jukebox_session_id IS NOT NULL
        ORDER BY started_at
      `),
      pool.query<{
        id: number;
        event_id: string;
        jukebox_session_id: string;
        requester_session_id: string;
        catalog_track_id: number;
        public_key: string;
        rvtr: string | null;
        virtualdj_track_identity: string;
        artist: string;
        title: string;
        year: number | null;
        source_path_snapshot: string;
        selected_source_label: string;
        source_relative_path: string | null;
        guest_comment: string | null;
        status: "new" | "accepted" | "played" | "skipped";
        dj_response: string | null;
        requested_at: Date | string;
        accepted_at: Date | string | null;
        played_at: Date | string | null;
        skipped_at: Date | string | null;
        responded_at: Date | string | null;
        updated_at: Date | string;
      }>(`
        SELECT r.id, r.event_id, r.jukebox_session_id, r.requester_session_id,
               r.catalog_track_id, t.public_key, r.rvtr, r.virtualdj_track_identity,
               r.artist, r.title, r.year, r.source_path_snapshot, r.selected_source_label,
               r.source_relative_path, r.guest_comment, r.status, r.dj_response,
               r.requested_at, r.accepted_at, r.played_at, r.skipped_at,
               r.responded_at, r.updated_at
        FROM retroverse_song_requests r
        JOIN retroverse_request_catalog_tracks t ON t.id = r.catalog_track_id
        WHERE r.jukebox_session_id IS NOT NULL AND r.requester_session_id IS NOT NULL
        ORDER BY r.id
      `),
      pool.query<{ request_limit: number | null }>(`
        SELECT request_limit FROM retroverse_jukebox_settings WHERE event_id = $1
      `, [catalog.event_id]),
      pool.query<{ max_id: number }>(`SELECT COALESCE(max(id), 0)::int AS max_id FROM retroverse_song_requests`),
    ]);

    const importedAt = new Date().toISOString();
    const state: LocalJukeboxState = {
      version: JUKEBOX_LOCAL_STATE_VERSION,
      updatedAt: importedAt,
      catalog: {
        eventId: catalog.event_id,
        title: catalog.title,
        sourceKind: catalog.source_kind,
        sourceKey: catalog.source_key,
        sourceLabel: catalog.source_label,
        capturedAt: iso(catalog.activated_at)!,
        tracks: trackResult.rows.map((track) => ({
          catalogTrackId: Number(track.id),
          key: track.public_key,
          rvtr: track.rvtr,
          virtualDjTrackIdentity: track.virtualdj_track_identity,
          artist: track.artist,
          title: track.title,
          year: track.year == null ? null : Number(track.year),
          localMediaPath: track.source_path_snapshot,
          selectedSourceLabel: track.selected_source_label,
          sourceRelativePath: track.source_relative_path,
        })),
      },
      defaultRequestLimit: settingsResult.rows[0]?.request_limit == null
        ? null
        : Number(settingsResult.rows[0].request_limit),
      nextRequestId: Number(maxIdResult.rows[0]?.max_id ?? 0) + 1,
      sessions: sessionResult.rows.map((session) => ({
        sessionId: session.session_id,
        publicSessionToken: randomUUID(),
        catalogEventId: session.catalog_event_id,
        name: session.display_name,
        sessionDate: session.session_date,
        status: session.status,
        requestsEnabled: false,
        requestLimit: session.request_limit == null ? null : Number(session.request_limit),
        startedAt: iso(session.started_at)!,
        endedAt: iso(session.ended_at),
        updatedAt: iso(session.updated_at)!,
      })),
      guests: guestResult.rows.map((guest) => ({
        sessionId: guest.session_id,
        eventId: guest.event_id,
        jukeboxSessionId: guest.jukebox_session_id,
        source: "local" as const,
        publicGuestId: null,
        guestNumber: Number(guest.guest_number),
        nickname: guest.nickname,
        startedAt: iso(guest.started_at)!,
        lastSeenAt: iso(guest.last_seen_at)!,
        endedAt: iso(guest.ended_at),
      })),
      requests: requestResult.rows.map((request) => ({
        id: Number(request.id),
        syncId: randomUUID(),
        neonRequestId: Number(request.id),
        eventId: request.event_id,
        jukeboxSessionId: request.jukebox_session_id,
        requesterSessionId: request.requester_session_id,
        source: "local" as const,
        publicRequestId: null,
        catalogTrackId: Number(request.catalog_track_id),
        catalogTrackKey: request.public_key,
        rvtr: request.rvtr,
        virtualDjTrackIdentity: request.virtualdj_track_identity,
        artist: request.artist,
        title: request.title,
        year: request.year == null ? null : Number(request.year),
        localMediaPath: request.source_path_snapshot,
        selectedSourceLabel: request.selected_source_label,
        sourceRelativePath: request.source_relative_path,
        guestComment: request.guest_comment,
        status: request.status,
        djResponse: request.dj_response,
        requestedAt: iso(request.requested_at)!,
        acceptedAt: iso(request.accepted_at),
        playedAt: iso(request.played_at),
        skippedAt: iso(request.skipped_at),
        respondedAt: iso(request.responded_at),
        updatedAt: iso(request.updated_at)!,
      })),
      sync: {
        importedFromNeonAt: importedAt,
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastError: null,
      },
      publicRelay: {
        status: "closed",
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastPollAt: null,
        lastError: null,
        pendingCount: 0,
        receipts: [],
      },
    };

    await replaceJukeboxLocalState(state);
    console.log(JSON.stringify({
      path: target,
      catalogTracks: state.catalog.tracks.length,
      sessions: state.sessions.length,
      guests: state.guests.length,
      requests: state.requests.length,
      nextRequestId: state.nextRequestId,
    }, null, 2));
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
