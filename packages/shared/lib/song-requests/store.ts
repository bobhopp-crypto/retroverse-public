import "server-only";

import { randomUUID } from "crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { getPassPool, passQuery } from "@/lib/retroverse-pass/pg";

import { guestCatalogDisplayName } from "./guest-catalog";
import type {
  ActiveRequestEvent,
  GuestCatalogTrack,
  GuestRequestReceipt,
  GuestRequestState,
  OperatorRequest,
  RequestStatus,
  VirtualDjSourceSelection,
} from "./types";

const EVENT_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/;

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dbMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rethrowRequestDbError(error: unknown): never {
  const message = dbMessage(error);
  if (message.includes("retroverse_request_") || message.includes("retroverse_song_requests")) {
    throw new Error("Song-request tables are missing. Run docs/migrations/retroverse-song-requests.sql.");
  }
  throw error instanceof Error ? error : new Error(message);
}

export class SongRequestInputError extends Error {
  readonly code: "unavailable" | "allowance_used" | "invalid" | "stale_catalog";

  constructor(code: SongRequestInputError["code"], message: string) {
    super(message);
    this.name = "SongRequestInputError";
    this.code = code;
  }
}

type ActiveEventRow = {
  event_id: string;
  title: string;
  activated_at: Date | string;
  source_id: number | string | null;
  source_kind: "folder" | "list" | "playlist" | null;
  source_label: string | null;
  eligible_track_count: number | string | null;
};

function mapActiveEvent(row: ActiveEventRow): ActiveRequestEvent {
  return {
    eventId: row.event_id,
    title: row.title,
    sourceId: row.source_id == null ? null : Number(row.source_id),
    sourceKind: row.source_kind,
    sourceLabel: row.source_label,
    eligibleTrackCount: Number(row.eligible_track_count ?? 0),
    activatedAt: iso(row.activated_at),
  };
}

async function queryRows<T extends QueryResultRow>(
  client: Pick<PoolClient, "query">,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await client.query<T>(text, params)).rows;
}

async function activeEventRows(
  query: <T extends QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>,
): Promise<ActiveEventRow[]> {
  return query<ActiveEventRow>(
    `
      SELECT e.event_id, e.title, e.activated_at,
             s.id AS source_id, s.source_kind, s.source_label, s.eligible_track_count
      FROM retroverse_request_events e
      LEFT JOIN LATERAL (
        SELECT id, source_kind, source_label, eligible_track_count
        FROM retroverse_request_sources
        WHERE event_id = e.event_id AND deactivated_at IS NULL
        ORDER BY activated_at DESC
        LIMIT 1
      ) s ON true
      WHERE e.is_active = true
      ORDER BY e.activated_at DESC
      LIMIT 1
    `,
  );
}

export async function loadActiveRequestEvent(): Promise<ActiveRequestEvent | null> {
  try {
    const rows = await activeEventRows(passQuery);
    return rows[0] ? mapActiveEvent(rows[0]) : null;
  } catch (error) {
    rethrowRequestDbError(error);
  }
}

export function normalizeRequestEventId(input: string): string {
  const eventId = input.trim();
  if (!EVENT_ID_RE.test(eventId)) {
    throw new SongRequestInputError(
      "invalid",
      "Event key must be 1-80 letters, numbers, dots, colons, underscores, or dashes.",
    );
  }
  return eventId;
}

export async function activateRequestSource(input: {
  eventId: string;
  eventTitle: string;
  selection: VirtualDjSourceSelection;
}): Promise<ActiveRequestEvent> {
  const eventId = normalizeRequestEventId(input.eventId);
  const title = input.eventTitle.trim() || eventId;
  if (title.length > 160) throw new SongRequestInputError("invalid", "Event title is too long.");
  if (input.selection.tracks.length === 0) {
    throw new SongRequestInputError("invalid", "The selected VirtualDJ source has no eligible tracks.");
  }

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE retroverse_request_events SET is_active = false, updated_at = now() WHERE is_active = true AND event_id <> $1`,
      [eventId],
    );
    await client.query(
      `
        INSERT INTO retroverse_request_events (event_id, title, is_active, activated_at, updated_at)
        VALUES ($1, $2, true, now(), now())
        ON CONFLICT (event_id) DO UPDATE
        SET title = EXCLUDED.title, is_active = true, activated_at = now(), updated_at = now()
      `,
      [eventId, title],
    );
    await client.query(
      `UPDATE retroverse_request_sources SET deactivated_at = now() WHERE event_id = $1 AND deactivated_at IS NULL`,
      [eventId],
    );
    const sourceRows = await queryRows<{ id: number | string }>(
      client,
      `
        INSERT INTO retroverse_request_sources (
          event_id, source_kind, source_key, source_label, include_descendants,
          eligible_track_count, activated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, now())
        RETURNING id
      `,
      [
        eventId,
        input.selection.sourceKind,
        input.selection.sourceKey,
        input.selection.sourceLabel,
        input.selection.includeDescendants,
        input.selection.tracks.length,
      ],
    );
    const sourceId = Number(sourceRows[0]!.id);

    const chunkSize = 200;
    for (let offset = 0; offset < input.selection.tracks.length; offset += chunkSize) {
      const chunk = input.selection.tracks.slice(offset, offset + chunkSize);
      const values: unknown[] = [];
      const rowsSql = chunk.map((track, index) => {
        const base = index * 11;
        values.push(
          sourceId,
          eventId,
          randomUUID(),
          track.rvtr,
          track.virtualDjTrackIdentity,
          track.artist,
          track.title,
          track.year,
          track.localMediaPath,
          input.selection.sourceLabel,
          track.sourceRelativePath,
        );
        return `(${Array.from({ length: 11 }, (_, column) => `$${base + column + 1}`).join(", ")})`;
      });
      await client.query(
        `
          INSERT INTO retroverse_request_catalog_tracks (
            source_id, event_id, public_key, rvtr, virtualdj_track_identity, artist, title, year,
            source_path_snapshot, selected_source_label, source_relative_path
          ) VALUES ${rowsSql.join(", ")}
          ON CONFLICT (source_id, source_path_snapshot) DO NOTHING
        `,
        values,
      );
    }

    await client.query("COMMIT");
    return {
      eventId,
      title,
      sourceId,
      sourceKind: input.selection.sourceKind,
      sourceLabel: input.selection.sourceLabel,
      eligibleTrackCount: input.selection.tracks.length,
      activatedAt: new Date().toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof SongRequestInputError) throw error;
    rethrowRequestDbError(error);
  } finally {
    client.release();
  }
}

type GuestStateRow = {
  event_id: string;
  event_title: string;
  source_label: string;
  source_kind: "folder" | "list" | "playlist";
  eligible_track_count: number | string;
  visitor_id: number | string;
  allowance: number | string | null;
  used_count: number | string | null;
};

type ReceiptRow = {
  id: number | string;
  artist: string;
  title: string;
  year: number | string | null;
  requested_at: Date | string;
  dj_response: string | null;
};

function mapReceipt(row: ReceiptRow): GuestRequestReceipt {
  return {
    artist: row.artist,
    title: row.title,
    year: row.year == null ? null : Number(row.year),
    requestedAt: iso(row.requested_at),
    djResponse: row.dj_response,
  };
}

export async function loadGuestRequestState(passSerial: string): Promise<GuestRequestState> {
  try {
    const rows = await passQuery<GuestStateRow>(
      `
        SELECT e.event_id, e.title AS event_title, s.source_label, s.source_kind,
               s.eligible_track_count, p.visitor_id,
               a.allowance, a.used_count
        FROM retroverse_passes p
        JOIN retroverse_request_events e ON e.is_active = true
        JOIN retroverse_request_sources s
          ON s.event_id = e.event_id AND s.deactivated_at IS NULL
        LEFT JOIN retroverse_request_allowances a
          ON a.event_id = e.event_id
         AND a.pass_serial = p.serial
         AND a.visitor_id = p.visitor_id
        WHERE p.serial = $1 AND p.claimed = true AND p.visitor_id IS NOT NULL
        ORDER BY e.activated_at DESC, s.activated_at DESC
        LIMIT 1
      `,
      [passSerial],
    );
    const state = rows[0];
    if (!state) {
      return {
        enabled: false,
        eventTitle: null,
        catalogName: null,
        availableSongCount: 0,
        canRequest: false,
        lastRequest: null,
      };
    }
    const receipts = await passQuery<ReceiptRow>(
      `
        SELECT id, artist, title, year, requested_at, dj_response
        FROM retroverse_song_requests
        WHERE event_id = $1 AND visitor_id = $2 AND pass_serial = $3
        ORDER BY requested_at DESC
        LIMIT 1
      `,
      [state.event_id, Number(state.visitor_id), passSerial],
    );
    const allowance = Number(state.allowance ?? 1);
    const used = Number(state.used_count ?? 0);
    return {
      enabled: true,
      eventTitle: state.event_title,
      catalogName: guestCatalogDisplayName(state.source_label, state.source_kind),
      availableSongCount: Number(state.eligible_track_count),
      canRequest: used < allowance,
      lastRequest: receipts[0] ? mapReceipt(receipts[0]) : null,
    };
  } catch (error) {
    rethrowRequestDbError(error);
  }
}

export async function loadGuestCatalog(input: {
  passSerial: string;
  query: string;
  sort: "title" | "artist";
}): Promise<{ tracks: GuestCatalogTrack[]; total: number }> {
  const state = await loadGuestRequestState(input.passSerial);
  if (!state.enabled || !state.canRequest) {
    throw new SongRequestInputError("unavailable", "Song requests are not available for this pass.");
  }
  const query = input.query.trim().slice(0, 80);
  try {
    const countRows = await passQuery<{ total: number | string }>(
      `
        SELECT count(*)::int AS total
        FROM retroverse_request_catalog_tracks t
        JOIN retroverse_request_events e ON e.event_id = t.event_id AND e.is_active = true
        JOIN retroverse_request_sources s ON s.id = t.source_id AND s.deactivated_at IS NULL
        WHERE ($1 = '' OR lower(t.artist) LIKE '%' || lower($1) || '%' OR lower(t.title) LIKE '%' || lower($1) || '%')
      `,
      [query],
    );
    const orderBy = input.sort === "artist"
      ? "lower(t.artist), lower(t.title), t.id"
      : "lower(t.title), lower(t.artist), t.id";
    const rows = await passQuery<{
      public_key: string;
      artist: string;
      title: string;
      year: number | string | null;
    }>(
      `
        SELECT t.public_key, t.artist, t.title, t.year
        FROM retroverse_request_catalog_tracks t
        JOIN retroverse_request_events e ON e.event_id = t.event_id AND e.is_active = true
        JOIN retroverse_request_sources s ON s.id = t.source_id AND s.deactivated_at IS NULL
        WHERE ($1 = '' OR lower(t.artist) LIKE '%' || lower($1) || '%' OR lower(t.title) LIKE '%' || lower($1) || '%')
        ORDER BY ${orderBy}
      `,
      [query],
    );
    return {
      total: Number(countRows[0]?.total ?? 0),
      tracks: rows.map((row) => ({
        key: row.public_key,
        artist: row.artist,
        title: row.title,
        year: row.year == null ? null : Number(row.year),
      })),
    };
  } catch (error) {
    rethrowRequestDbError(error);
  }
}

type SubmitTrackRow = {
  id: number | string;
  event_id: string;
  rvtr: string | null;
  virtualdj_track_identity: string;
  artist: string;
  title: string;
  year: number | string | null;
  source_path_snapshot: string;
  selected_source_label: string;
  source_relative_path: string | null;
};

export async function submitSongRequest(input: {
  passSerial: string;
  catalogTrackKey: string;
  guestComment?: string | null;
}): Promise<GuestRequestReceipt> {
  const trackKey = input.catalogTrackKey.trim();
  if (!/^[0-9a-f-]{20,64}$/i.test(trackKey)) {
    throw new SongRequestInputError("invalid", "Choose a song from the current catalog.");
  }
  const comment = input.guestComment?.trim() || null;
  if (comment && comment.length > 240) {
    throw new SongRequestInputError("invalid", "Comments must be 240 characters or fewer.");
  }

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    const passRows = await queryRows<{ visitor_id: number | string }>(
      client,
      `SELECT visitor_id FROM retroverse_passes WHERE serial = $1 AND claimed = true AND visitor_id IS NOT NULL FOR SHARE`,
      [input.passSerial],
    );
    const visitorId = Number(passRows[0]?.visitor_id);
    if (!Number.isSafeInteger(visitorId)) {
      throw new SongRequestInputError("unavailable", "This pass must be registered before requesting a song.");
    }
    const eventRows = await queryRows<{ event_id: string }>(
      client,
      `SELECT event_id FROM retroverse_request_events WHERE is_active = true ORDER BY activated_at DESC LIMIT 1 FOR SHARE`,
    );
    const eventId = eventRows[0]?.event_id;
    if (!eventId) throw new SongRequestInputError("unavailable", "Song requests are not active right now.");

    await client.query(
      `
        INSERT INTO retroverse_request_allowances (event_id, visitor_id, pass_serial, allowance, used_count)
        VALUES ($1, $2, $3, 1, 0)
        ON CONFLICT (event_id, pass_serial) DO UPDATE
        SET visitor_id = EXCLUDED.visitor_id, updated_at = now()
      `,
      [eventId, visitorId, input.passSerial],
    );
    const allowanceRows = await queryRows<{ allowance: number | string; used_count: number | string }>(
      client,
      `SELECT allowance, used_count FROM retroverse_request_allowances WHERE event_id = $1 AND pass_serial = $2 AND visitor_id = $3 FOR UPDATE`,
      [eventId, input.passSerial, visitorId],
    );
    if (Number(allowanceRows[0]?.used_count ?? 0) >= Number(allowanceRows[0]?.allowance ?? 1)) {
      throw new SongRequestInputError("allowance_used", "Your request was already received for this event.");
    }

    const trackRows = await queryRows<SubmitTrackRow>(
      client,
      `
        SELECT t.id, t.event_id, t.rvtr, t.virtualdj_track_identity, t.artist, t.title, t.year,
               t.source_path_snapshot, t.selected_source_label, t.source_relative_path
        FROM retroverse_request_catalog_tracks t
        JOIN retroverse_request_sources s ON s.id = t.source_id AND s.deactivated_at IS NULL
        WHERE t.public_key = $1 AND t.event_id = $2
        FOR SHARE
      `,
      [trackKey, eventId],
    );
    const track = trackRows[0];
    if (!track) {
      throw new SongRequestInputError("stale_catalog", "That catalog changed. Please choose the song again.");
    }
    const receiptRows = await queryRows<ReceiptRow>(
      client,
      `
        INSERT INTO retroverse_song_requests (
          event_id, visitor_id, pass_serial, catalog_track_id, rvtr,
          virtualdj_track_identity, artist, title, year, source_path_snapshot,
          selected_source_label, source_relative_path, guest_comment, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'new')
        RETURNING id, artist, title, year, requested_at, dj_response
      `,
      [
        eventId,
        visitorId,
        input.passSerial,
        Number(track.id),
        track.rvtr,
        track.virtualdj_track_identity,
        track.artist,
        track.title,
        track.year,
        track.source_path_snapshot,
        track.selected_source_label,
        track.source_relative_path,
        comment,
      ],
    );
    await client.query(
      `UPDATE retroverse_request_allowances SET used_count = used_count + 1, updated_at = now() WHERE event_id = $1 AND pass_serial = $2 AND visitor_id = $3`,
      [eventId, input.passSerial, visitorId],
    );
    await client.query("COMMIT");
    return mapReceipt(receiptRows[0]!);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof SongRequestInputError) throw error;
    rethrowRequestDbError(error);
  } finally {
    client.release();
  }
}

type OperatorRow = {
  id: number | string;
  event_id: string;
  requested_at: Date | string;
  visitor_id: number | string;
  first_name: string;
  pass_serial: string;
  artist: string;
  title: string;
  year: number | string | null;
  guest_comment: string | null;
  status: RequestStatus;
  dj_response: string | null;
};

export async function loadOperatorRequests(): Promise<{
  event: ActiveRequestEvent | null;
  requests: OperatorRequest[];
}> {
  const event = await loadActiveRequestEvent();
  if (!event) return { event: null, requests: [] };
  try {
    const rows = await passQuery<OperatorRow>(
      `
        SELECT r.id, r.event_id, r.requested_at, r.visitor_id, v.first_name,
               r.pass_serial, r.artist, r.title, r.year, r.guest_comment,
               r.status, r.dj_response
        FROM retroverse_song_requests r
        JOIN retroverse_visitors v ON v.id = r.visitor_id
        WHERE r.event_id = $1
        ORDER BY r.requested_at DESC
      `,
      [event.eventId],
    );
    return {
      event,
      requests: rows.map((row, index) => ({
        id: Number(row.id),
        eventId: row.event_id,
        requestedAt: iso(row.requested_at),
        memberId: Number(row.visitor_id),
        memberFirstName: row.first_name,
        passSerial: row.pass_serial,
        artist: row.artist,
        title: row.title,
        year: row.year == null ? null : Number(row.year),
        guestComment: row.guest_comment,
        status: row.status,
        djResponse: row.dj_response,
        priorRequests: rows
          .slice(index + 1)
          .filter((prior) => Number(prior.visitor_id) === Number(row.visitor_id))
          .map((prior) => ({ artist: prior.artist, title: prior.title, requestedAt: iso(prior.requested_at) })),
      })),
    };
  } catch (error) {
    rethrowRequestDbError(error);
  }
}

export async function applyOperatorRequestAction(input: {
  requestId: number;
  action: "accept" | "skip" | "played" | "respond" | "replenish";
  response?: string | null;
}): Promise<void> {
  const requestId = Number(input.requestId);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    throw new SongRequestInputError("invalid", "Invalid request.");
  }
  const response = input.response?.trim() || null;
  if (input.action === "respond" && !response) {
    throw new SongRequestInputError("invalid", "Enter a response first.");
  }
  if (response && response.length > 240) {
    throw new SongRequestInputError("invalid", "Responses must be 240 characters or fewer.");
  }

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    const requestRows = await queryRows<{
      event_id: string;
      visitor_id: number | string;
      pass_serial: string;
      status: RequestStatus;
    }>(
      client,
      `
        SELECT r.event_id, r.visitor_id, r.pass_serial, r.status
        FROM retroverse_song_requests r
        JOIN retroverse_request_events e
          ON e.event_id = r.event_id AND e.is_active = true
        WHERE r.id = $1
        FOR UPDATE OF r
      `,
      [requestId],
    );
    const request = requestRows[0];
    if (!request) throw new SongRequestInputError("invalid", "Request not found in the current event.");

    if (input.action === "accept" && request.status !== "new") {
      throw new SongRequestInputError("invalid", "Only a new request can be accepted.");
    }
    if (input.action === "played" && request.status !== "accepted") {
      throw new SongRequestInputError("invalid", "Only an accepted request can be marked played.");
    }
    if (
      input.action === "skip" &&
      request.status !== "new" &&
      request.status !== "accepted"
    ) {
      throw new SongRequestInputError("invalid", "Only a new or accepted request can be skipped.");
    }

    if (input.action === "replenish") {
      await client.query(
        `
          INSERT INTO retroverse_request_allowances (event_id, visitor_id, pass_serial, allowance, used_count)
          VALUES ($1, $2, $3, 2, 1)
          ON CONFLICT (event_id, pass_serial) DO UPDATE
          SET allowance = retroverse_request_allowances.allowance + 1,
              visitor_id = EXCLUDED.visitor_id,
              updated_at = now()
        `,
        [request.event_id, Number(request.visitor_id), request.pass_serial],
      );
    } else if (input.action === "respond") {
      await client.query(
        `UPDATE retroverse_song_requests SET dj_response = $2, responded_at = now(), updated_at = now() WHERE id = $1`,
        [requestId, response],
      );
    } else {
      const status: RequestStatus = input.action === "accept" ? "accepted" : input.action === "played" ? "played" : "skipped";
      const timestampColumn = status === "accepted" ? "accepted_at" : status === "played" ? "played_at" : "skipped_at";
      await client.query(
        `UPDATE retroverse_song_requests SET status = $2, ${timestampColumn} = now(), updated_at = now() WHERE id = $1`,
        [requestId, status],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof SongRequestInputError) throw error;
    rethrowRequestDbError(error);
  } finally {
    client.release();
  }
}

export type AcceptedBridgeRequest = {
  requestId: number;
  artist: string;
  title: string;
  localMediaPath: string;
  acceptedAt: string;
};

export async function loadAcceptedBridgeRequests(): Promise<{
  eventId: string | null;
  generatedAt: string;
  requests: AcceptedBridgeRequest[];
}> {
  const event = await loadActiveRequestEvent();
  if (!event) return { eventId: null, generatedAt: new Date().toISOString(), requests: [] };
  const rows = await passQuery<{
    id: number | string;
    artist: string;
    title: string;
    source_path_snapshot: string;
    accepted_at: Date | string;
  }>(
    `
      SELECT id, artist, title, source_path_snapshot, accepted_at
      FROM retroverse_song_requests
      WHERE event_id = $1 AND status = 'accepted' AND accepted_at IS NOT NULL
      ORDER BY accepted_at ASC, id ASC
    `,
    [event.eventId],
  );
  return {
    eventId: event.eventId,
    generatedAt: new Date().toISOString(),
    requests: rows.map((row) => ({
      requestId: Number(row.id),
      artist: row.artist,
      title: row.title,
      localMediaPath: row.source_path_snapshot,
      acceptedAt: iso(row.accepted_at),
    })),
  };
}
