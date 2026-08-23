import "server-only";

import { randomUUID } from "node:crypto";
import { networkInterfaces, hostname as systemHostname } from "node:os";

import {
  normVdjPath,
  scanVdjDatabase,
  type VdjLibraryEntry,
} from "@/lib/ops/intelligence/vdj-database";

import { guestCatalogDisplayName } from "./guest-catalog";
import {
  jukeboxLocalStatePath,
  mutateJukeboxLocalState,
  readJukeboxLocalState,
  type LocalJukeboxCatalogTrack,
  type LocalJukeboxGigSession,
  type LocalJukeboxGuestSession,
  type LocalJukeboxRequest,
  type LocalJukeboxState,
} from "./jukebox-local-state";
import type {
  JukeboxCatalogPayload,
  JukeboxCatalogTrack,
  JukeboxLiveSession,
  JukeboxOperatorStatus,
  JukeboxPublicState,
  JukeboxRequestPolicy,
  JukeboxRequestReceipt,
  JukeboxSession,
} from "./jukebox-types";
import type {
  PublicJukeboxRelayAck,
  PublicJukeboxRelayControl,
  PublicJukeboxRelayRequest,
} from "./jukebox-relay-types";
import { loadJukeboxBridgeStatus, writeJukeboxRequestList } from "./jukebox-runtime";

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACK_KEY_RE = /^[0-9a-f-]{20,64}$/i;

export class JukeboxInputError extends Error {
  readonly code: "closed" | "invalid" | "limit" | "session" | "stale";

  constructor(code: JukeboxInputError["code"], message: string) {
    super(message);
    this.name = "JukeboxInputError";
    this.code = code;
  }
}

function activeGig(state: LocalJukeboxState): LocalJukeboxGigSession | null {
  return state.sessions.find((session) => session.status === "active" && session.endedAt == null) ?? null;
}

function workingGig(state: LocalJukeboxState): LocalJukeboxGigSession | null {
  return activeGig(state) ?? [...state.sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

function orderedGigRequests(state: LocalJukeboxState, sessionId: string): LocalJukeboxRequest[] {
  return state.requests
    .filter((request) => request.jukeboxSessionId === sessionId)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id - b.id);
}

export async function refreshJukeboxRequestList(): Promise<void> {
  const state = await readJukeboxLocalState();
  const session = workingGig(state);
  const requests = session ? orderedGigRequests(state, session.sessionId) : [];
  await writeJukeboxRequestList(requests.map((request) => ({
    artist: request.artist,
    title: request.title,
    localMediaPath: request.localMediaPath,
  })));
}

function entryMap(entries: VdjLibraryEntry[]): Map<string, VdjLibraryEntry> {
  return new Map(entries.map((entry) => [entry.filePathNorm, entry]));
}

function playableCatalogTracks(
  state: LocalJukeboxState,
  vdjByPath: Map<string, VdjLibraryEntry>,
): Array<{ track: LocalJukeboxCatalogTrack; vdj: VdjLibraryEntry }> {
  return (state.catalog?.tracks ?? [])
    .map((track) => ({ track, vdj: vdjByPath.get(normVdjPath(track.localMediaPath)) ?? null }))
    .filter((item): item is { track: LocalJukeboxCatalogTrack; vdj: VdjLibraryEntry } => item.vdj?.isVideo === true);
}

function normalizeNickname(value: string | null | undefined): string | null {
  const normalized = (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  if (normalized.length > 32) {
    throw new JukeboxInputError("invalid", "Please use a nickname with 32 characters or fewer.");
  }
  return normalized;
}

function normalizeSessionId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!SESSION_ID_RE.test(normalized)) {
    throw new JukeboxInputError("session", "Please start a new guest session.");
  }
  return normalized;
}

function requesterLabel(nickname: string | null, guestNumber: number): string {
  return nickname ? `${nickname} · Guest ${guestNumber}` : `Guest ${guestNumber}`;
}

function guestRequestCount(state: LocalJukeboxState, sessionId: string): number {
  return state.requests.filter((request) => request.requesterSessionId === sessionId).length;
}

function mapGuestSession(state: LocalJukeboxState, guest: LocalJukeboxGuestSession): JukeboxSession {
  const gig = state.sessions.find((session) => session.sessionId === guest.jukeboxSessionId) ?? null;
  const requestCount = guestRequestCount(state, guest.sessionId);
  const requestLimit = gig?.requestLimit ?? null;
  return {
    sessionId: guest.sessionId,
    eventId: guest.eventId,
    guestNumber: guest.guestNumber,
    nickname: guest.nickname,
    label: requesterLabel(guest.nickname, guest.guestNumber),
    startedAt: guest.startedAt,
    endedAt: guest.endedAt,
    requestCount,
    requestLimit,
    canRequest:
      gig?.status === "active" &&
      gig.endedAt == null &&
      gig.requestsEnabled &&
      guest.endedAt == null &&
      (requestLimit == null || requestCount < requestLimit),
  };
}

function mapLiveSession(session: LocalJukeboxGigSession): JukeboxLiveSession {
  return {
    sessionId: session.sessionId,
    name: session.name,
    sessionDate: session.sessionDate,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: session.status,
  };
}

function dateRank(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number(value) || 0;
}

function catalogTrack(
  track: LocalJukeboxCatalogTrack,
  vdj: VdjLibraryEntry,
  alreadyRequested: Set<number>,
): JukeboxCatalogTrack {
  return {
    key: track.key,
    artist: track.artist,
    title: track.title,
    year: track.year,
    playCount: vdj.playCount ?? 0,
    lastPlayed: vdj.lastPlayed,
    heroUrl: `/api/jukebox/hero/${encodeURIComponent(track.key)}`,
    alreadyRequested: alreadyRequested.has(track.catalogTrackId),
  };
}

export async function loadJukeboxPublicState(): Promise<JukeboxPublicState> {
  const state = await readJukeboxLocalState();
  const session = activeGig(state);
  if (!state.catalog || !session) {
    return {
      ready: false,
      isOpen: false,
      eventTitle: null,
      catalogName: null,
      catalogCount: 0,
      requestsPerGuest: null,
      decades: [],
    };
  }
  const scan = await scanVdjDatabase();
  const playable = playableCatalogTracks(state, entryMap(scan.entries));
  const decades = [...new Set(
    playable
      .map(({ track }) => track.year == null ? null : Math.floor(track.year / 10) * 10)
      .filter((value): value is number => value != null && value >= 1960 && value <= 2020),
  )].sort((a, b) => a - b);
  return {
    ready: playable.length > 0,
    isOpen: session.requestsEnabled,
    eventTitle: session.name,
    catalogName: guestCatalogDisplayName(state.catalog.sourceLabel, state.catalog.sourceKind),
    catalogCount: playable.length,
    requestsPerGuest: session.requestLimit,
    decades,
  };
}

export async function loadJukeboxCatalog(input: {
  query?: string;
  decade?: number | null;
  mode?: "popular" | "recent" | "browse";
  limit?: number;
}): Promise<JukeboxCatalogPayload> {
  const state = await readJukeboxLocalState();
  const session = activeGig(state);
  if (!state.catalog || !session || !session.requestsEnabled) {
    throw new JukeboxInputError("closed", "The video jukebox is closed right now.");
  }
  const scan = await scanVdjDatabase();
  const requested = new Set(
    state.requests
      .filter((request) =>
        request.jukeboxSessionId === session.sessionId &&
        (request.status === "new" || request.status === "accepted"),
      )
      .map((request) => request.catalogTrackId),
  );
  const needle = (input.query ?? "").trim().toLocaleLowerCase().slice(0, 80);
  const decade = Number.isFinite(input.decade) ? Number(input.decade) : null;
  const mode = input.mode ?? "browse";
  const limit = Math.max(1, Math.min(90, Math.floor(input.limit ?? 60)));
  let items = playableCatalogTracks(state, entryMap(scan.entries)).filter(({ track }) => {
    if (decade != null && (track.year == null || Math.floor(track.year / 10) * 10 !== decade)) return false;
    if (!needle) return true;
    return track.artist.toLocaleLowerCase().includes(needle) || track.title.toLocaleLowerCase().includes(needle);
  });
  if (mode === "popular") {
    items = items.sort((a, b) =>
      (b.vdj.playCount ?? 0) - (a.vdj.playCount ?? 0) ||
      a.track.artist.localeCompare(b.track.artist) ||
      a.track.title.localeCompare(b.track.title),
    );
  } else if (mode === "recent") {
    items = items
      .filter((item) => Boolean(item.vdj.lastPlayed))
      .sort((a, b) => dateRank(b.vdj.lastPlayed) - dateRank(a.vdj.lastPlayed));
  } else {
    items = items.sort((a, b) =>
      a.track.artist.localeCompare(b.track.artist) || a.track.title.localeCompare(b.track.title),
    );
  }
  return {
    total: items.length,
    tracks: items.slice(0, limit).map(({ track, vdj }) => catalogTrack(track, vdj, requested)),
  };
}

export async function loadJukeboxSession(sessionIdInput: string): Promise<JukeboxSession> {
  const sessionId = normalizeSessionId(sessionIdInput);
  return mutateJukeboxLocalState((state) => {
    const guest = state.guests.find((candidate) => candidate.sessionId === sessionId);
    if (!guest) throw new JukeboxInputError("session", "That guest session has ended.");
    if (!guest.endedAt) guest.lastSeenAt = new Date().toISOString();
    return mapGuestSession(state, guest);
  });
}

export async function createJukeboxSession(nicknameInput?: string | null): Promise<JukeboxSession> {
  const nickname = normalizeNickname(nicknameInput);
  return mutateJukeboxLocalState((state) => {
    const gig = activeGig(state);
    if (!state.catalog || !gig || !gig.requestsEnabled) {
      throw new JukeboxInputError("closed", "Song requests are closed right now.");
    }
    const guestNumber = Math.max(
      0,
      ...state.guests
        .filter((guest) => guest.jukeboxSessionId === gig.sessionId)
        .map((guest) => guest.guestNumber),
    ) + 1;
    const now = new Date().toISOString();
    const guest: LocalJukeboxGuestSession = {
      sessionId: randomUUID(),
      eventId: gig.catalogEventId,
      jukeboxSessionId: gig.sessionId,
      source: "local",
      publicGuestId: null,
      guestNumber,
      nickname,
      startedAt: now,
      lastSeenAt: now,
      endedAt: null,
    };
    state.guests.push(guest);
    return mapGuestSession(state, guest);
  });
}

export async function endJukeboxSession(sessionIdInput: string): Promise<void> {
  const sessionId = normalizeSessionId(sessionIdInput);
  await mutateJukeboxLocalState((state) => {
    const guest = state.guests.find((candidate) => candidate.sessionId === sessionId);
    if (!guest) return;
    const now = new Date().toISOString();
    guest.endedAt ??= now;
    guest.lastSeenAt = now;
  });
}

export async function submitJukeboxRequest(input: {
  sessionId: string;
  catalogTrackKey: string;
}): Promise<JukeboxRequestReceipt> {
  const sessionId = normalizeSessionId(input.sessionId);
  const trackKey = input.catalogTrackKey.trim();
  if (!TRACK_KEY_RE.test(trackKey)) {
    throw new JukeboxInputError("invalid", "Choose a video from the current jukebox.");
  }
  const receipt = await mutateJukeboxLocalState((state) => {
    const guest = state.guests.find((candidate) => candidate.sessionId === sessionId);
    const gig = guest
      ? state.sessions.find((candidate) => candidate.sessionId === guest.jukeboxSessionId)
      : null;
    if (!guest || !gig || guest.endedAt || gig.status !== "active" || gig.endedAt || !gig.requestsEnabled) {
      throw new JukeboxInputError("session", "Please start a new guest session.");
    }
    const requestCount = guestRequestCount(state, guest.sessionId);
    if (gig.requestLimit != null && requestCount >= gig.requestLimit) {
      throw new JukeboxInputError("limit", "You have reached the request limit for this session.");
    }
    const track = state.catalog?.tracks.find((candidate) => candidate.key === trackKey);
    if (!track || state.catalog?.eventId !== gig.catalogEventId) {
      throw new JukeboxInputError("stale", "That video is no longer in the active jukebox.");
    }
    const duplicate = state.requests.find((request) =>
      request.jukeboxSessionId === gig.sessionId &&
      request.catalogTrackId === track.catalogTrackId &&
      (request.status === "new" || request.status === "accepted"),
    );
    const now = new Date().toISOString();
    guest.lastSeenAt = now;
    if (duplicate) {
      return {
        requestId: duplicate.id,
        artist: duplicate.artist,
        title: duplicate.title,
        year: duplicate.year,
        requestedAt: duplicate.requestedAt,
        duplicate: true,
      };
    }
    const request: LocalJukeboxRequest = {
      id: state.nextRequestId,
      syncId: randomUUID(),
      neonRequestId: null,
      eventId: gig.catalogEventId,
      jukeboxSessionId: gig.sessionId,
      requesterSessionId: guest.sessionId,
      source: "local",
      publicRequestId: null,
      catalogTrackId: track.catalogTrackId,
      catalogTrackKey: track.key,
      rvtr: track.rvtr,
      virtualDjTrackIdentity: track.virtualDjTrackIdentity,
      artist: track.artist,
      title: track.title,
      year: track.year,
      localMediaPath: track.localMediaPath,
      selectedSourceLabel: track.selectedSourceLabel,
      sourceRelativePath: track.sourceRelativePath,
      guestComment: null,
      status: "new",
      djResponse: null,
      requestedAt: now,
      acceptedAt: null,
      playedAt: null,
      skippedAt: null,
      respondedAt: null,
      updatedAt: now,
    };
    state.nextRequestId += 1;
    state.requests.push(request);
    return {
      requestId: request.id,
      artist: request.artist,
      title: request.title,
      year: request.year,
      requestedAt: request.requestedAt,
      duplicate: false,
    };
  });
  await refreshJukeboxRequestList();
  return receipt;
}

function chicagoDateParts(now: Date): { sessionDate: string; label: string } {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? "";
  const sessionDate = `${part("year")}-${part("month")}-${part("day")}`;
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  return { sessionDate, label };
}

export async function startNewJukeboxSession(nameInput?: string | null): Promise<JukeboxLiveSession> {
  const name = (nameInput ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return mutateJukeboxLocalState((state) => {
    if (!state.catalog || state.catalog.tracks.length === 0) {
      throw new JukeboxInputError("closed", "No local request catalog is available for the jukebox.");
    }
    if (activeGig(state)) {
      throw new JukeboxInputError("invalid", "End the current jukebox session before starting another one.");
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const chicago = chicagoDateParts(now);
    const session: LocalJukeboxGigSession = {
      sessionId: randomUUID(),
      publicSessionToken: randomUUID(),
      catalogEventId: state.catalog.eventId,
      name: name || `Video Jukebox — ${chicago.label.replace(" at ", " · ")}`,
      sessionDate: chicago.sessionDate,
      status: "active",
      requestsEnabled: false,
      requestLimit: state.defaultRequestLimit,
      startedAt: nowIso,
      endedAt: null,
      updatedAt: nowIso,
    };
    state.sessions.push(session);
    state.publicRelay = {
      status: "closed",
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastPollAt: null,
      lastError: null,
      pendingCount: 0,
      receipts: [],
    };
    return mapLiveSession(session);
  });
}

export async function endActiveJukeboxSession(): Promise<JukeboxLiveSession> {
  return mutateJukeboxLocalState((state) => {
    const session = activeGig(state);
    if (!session) throw new JukeboxInputError("invalid", "No active jukebox session is running.");
    const now = new Date().toISOString();
    session.status = "ended";
    session.requestsEnabled = false;
    session.endedAt = now;
    session.updatedAt = now;
    for (const guest of state.guests) {
      if (guest.jukeboxSessionId !== session.sessionId) continue;
      guest.endedAt ??= now;
      guest.lastSeenAt = now;
    }
    return mapLiveSession(session);
  });
}

export async function setJukeboxPolicy(input: {
  requestsPerGuest: number | null;
}): Promise<JukeboxRequestPolicy> {
  const requestLimit = input.requestsPerGuest == null ? null : Math.floor(input.requestsPerGuest);
  if (requestLimit != null && (!Number.isSafeInteger(requestLimit) || requestLimit < 1 || requestLimit > 99)) {
    throw new JukeboxInputError("invalid", "The request limit must be between 1 and 99, or Unlimited.");
  }
  return mutateJukeboxLocalState((state) => {
    const session = activeGig(state);
    if (!session) throw new JukeboxInputError("closed", "Start a jukebox session before changing its policy.");
    const now = new Date().toISOString();
    session.requestLimit = requestLimit;
    session.updatedAt = now;
    state.defaultRequestLimit = requestLimit;
    return { isOpen: session.requestsEnabled, requestsPerGuest: requestLimit };
  });
}

export async function setJukeboxRequestsEnabled(enabled: boolean): Promise<JukeboxRequestPolicy> {
  return mutateJukeboxLocalState((state) => {
    const session = activeGig(state);
    if (!session) throw new JukeboxInputError("closed", "Start a jukebox session first.");
    session.requestsEnabled = enabled;
    session.updatedAt = new Date().toISOString();
    if (!enabled) state.publicRelay.status = "closed";
    return { isOpen: enabled, requestsPerGuest: session.requestLimit };
  });
}

export async function loadJukeboxRelayControlSnapshot(
  includeCatalog: boolean,
): Promise<PublicJukeboxRelayControl> {
  const state = await readJukeboxLocalState();
  const session = activeGig(state);
  if (!session || !state.catalog) throw new JukeboxInputError("closed", "No active jukebox session is running.");
  let catalog: PublicJukeboxRelayControl["catalog"];
  if (includeCatalog) {
    const scan = await scanVdjDatabase();
    catalog = playableCatalogTracks(state, entryMap(scan.entries)).map(({ track }) => ({
      key: track.key,
      artist: track.artist,
      title: track.title,
      year: track.year,
      rvtr: track.rvtr,
      heroUrl: track.rvtr
        ? `/api/experience/visual-asset?rvtr=${encodeURIComponent(track.rvtr)}&file=hero-video.jpg`
        : null,
    }));
  }
  return {
    sessionToken: session.publicSessionToken,
    isOpen: session.requestsEnabled,
    requestLimit: session.requestLimit,
    ...(catalog ? { catalog } : {}),
  };
}

export async function recordJukeboxRelayDiagnostics(input: {
  status: "closed" | "open" | "error";
  attempt?: boolean;
  success?: boolean;
  poll?: boolean;
  pendingCount?: number;
  error?: string | null;
}): Promise<void> {
  await mutateJukeboxLocalState((state) => {
    const now = new Date().toISOString();
    state.publicRelay.status = input.status;
    if (input.attempt) state.publicRelay.lastAttemptAt = now;
    if (input.success) state.publicRelay.lastSuccessAt = now;
    if (input.poll) state.publicRelay.lastPollAt = now;
    if (input.pendingCount != null) state.publicRelay.pendingCount = Math.max(0, Math.floor(input.pendingCount));
    state.publicRelay.lastError = input.error?.slice(0, 240) || null;
  });
}

export async function ingestPublicJukeboxRequest(
  input: PublicJukeboxRelayRequest,
): Promise<{ acknowledgement: PublicJukeboxRelayAck; inserted: boolean }> {
  const publicRequestId = normalizeSessionId(input.publicRequestId);
  const publicSessionToken = normalizeSessionId(input.sessionToken);
  const publicGuestId = normalizeSessionId(input.guestId);
  const requestedTrackKey = input.trackKey.trim();
  if (!TRACK_KEY_RE.test(requestedTrackKey)) {
    throw new JukeboxInputError("invalid", "Invalid public catalog track.");
  }
  const guestNickname = normalizeNickname(input.nickname);
  const result = await mutateJukeboxLocalState((state) => {
    const prior = state.publicRelay.receipts.find((receipt) =>
      receipt.publicRequestId === publicRequestId && receipt.publicSessionToken === publicSessionToken,
    );
    if (prior) {
      return {
        acknowledgement: {
          publicRequestId,
          result: prior.result === "rejected" ? "rejected" as const : "delivered" as const,
          localRequestId: prior.localRequestId,
          detail: prior.detail,
        },
        inserted: false,
      };
    }

    const session = activeGig(state);
    const now = new Date().toISOString();
    const remember = (
      resultType: "inserted" | "duplicate" | "rejected",
      localRequestId: number | null,
      detail: string | null,
    ) => {
      state.publicRelay.receipts.push({
        publicRequestId,
        publicSessionToken,
        localRequestId,
        result: resultType,
        detail,
        receivedAt: now,
      });
      return {
        acknowledgement: {
          publicRequestId,
          result: resultType === "rejected" ? "rejected" as const : "delivered" as const,
          localRequestId,
          detail,
        },
        inserted: resultType === "inserted",
      };
    };

    if (
      !session ||
      !session.requestsEnabled ||
      session.publicSessionToken !== publicSessionToken ||
      session.status !== "active" ||
      session.endedAt
    ) {
      return remember("rejected", null, "This request belongs to a closed or different event.");
    }
    const track = state.catalog?.tracks.find((candidate) => candidate.key === requestedTrackKey);
    if (!track || state.catalog?.eventId !== session.catalogEventId) {
      return remember("rejected", null, "That video is not in the active local catalog.");
    }

    let guest = state.guests.find((candidate) =>
      candidate.jukeboxSessionId === session.sessionId &&
      candidate.source === "public" &&
      candidate.publicGuestId === publicGuestId,
    );
    if (!guest) {
      const guestNumber = Math.max(
        0,
        ...state.guests
          .filter((candidate) => candidate.jukeboxSessionId === session.sessionId)
          .map((candidate) => candidate.guestNumber),
      ) + 1;
      guest = {
        sessionId: randomUUID(),
        eventId: session.catalogEventId,
        jukeboxSessionId: session.sessionId,
        source: "public",
        publicGuestId,
        guestNumber,
        nickname: guestNickname,
        startedAt: now,
        lastSeenAt: now,
        endedAt: null,
      };
      state.guests.push(guest);
    } else {
      guest.nickname = guestNickname;
      guest.lastSeenAt = now;
    }

    const count = guestRequestCount(state, guest.sessionId);
    if (session.requestLimit != null && count >= session.requestLimit) {
      return remember("rejected", null, "This guest has reached the request limit.");
    }
    const duplicate = state.requests.find((request) =>
      request.jukeboxSessionId === session.sessionId &&
      request.catalogTrackId === track.catalogTrackId &&
      (request.status === "new" || request.status === "accepted"),
    );
    if (duplicate) return remember("duplicate", duplicate.id, "Already in the Jukebox list.");

    const request: LocalJukeboxRequest = {
      id: state.nextRequestId,
      syncId: randomUUID(),
      neonRequestId: null,
      eventId: session.catalogEventId,
      jukeboxSessionId: session.sessionId,
      requesterSessionId: guest.sessionId,
      source: "public",
      publicRequestId,
      catalogTrackId: track.catalogTrackId,
      catalogTrackKey: track.key,
      rvtr: track.rvtr,
      virtualDjTrackIdentity: track.virtualDjTrackIdentity,
      artist: track.artist,
      title: track.title,
      year: track.year,
      localMediaPath: track.localMediaPath,
      selectedSourceLabel: track.selectedSourceLabel,
      sourceRelativePath: track.sourceRelativePath,
      guestComment: null,
      status: "new",
      djResponse: null,
      requestedAt: now,
      acceptedAt: null,
      playedAt: null,
      skippedAt: null,
      respondedAt: null,
      updatedAt: now,
    };
    state.nextRequestId += 1;
    state.requests.push(request);
    return remember("inserted", request.id, null);
  });
  return result;
}

export type ActiveJukeboxSessionIdentity = {
  sessionId: string;
  publicSessionToken: string;
  catalogEventId: string;
  name: string;
  sessionDate: string;
  startedAt: string;
  endedAt: string | null;
  requestLimit: number | null;
  requestsEnabled: boolean;
  sourceKind: "folder" | "list" | "playlist";
  sourceLabel: string;
  eligibleTrackCount: number;
};

export async function loadActiveJukeboxSessionIdentity(): Promise<ActiveJukeboxSessionIdentity | null> {
  const state = await readJukeboxLocalState();
  const session = activeGig(state);
  if (!session || !state.catalog) return null;
  return {
    sessionId: session.sessionId,
    publicSessionToken: session.publicSessionToken,
    catalogEventId: session.catalogEventId,
    name: session.name,
    sessionDate: session.sessionDate,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    requestLimit: session.requestLimit,
    requestsEnabled: session.requestsEnabled,
    sourceKind: state.catalog.sourceKind,
    sourceLabel: state.catalog.sourceLabel,
    eligibleTrackCount: state.catalog.tracks.length,
  };
}

function lanUrl(): string {
  const configured = process.env.RETROVERSE_JUKEBOX_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const rawHostname = systemHostname();
  const hostname = rawHostname.endsWith(".local") ? rawHostname : `${rawHostname}.local`;
  return `http://${hostname}:3000/jukebox`;
}

export function numericLanJukeboxUrl(): string | null {
  const interfaces = networkInterfaces();
  for (const name of ["en0", "en1", ...Object.keys(interfaces)]) {
    for (const address of interfaces[name] ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return `http://${address.address}:3000/jukebox`;
      }
    }
  }
  return null;
}

export async function loadJukeboxOperatorStatus(): Promise<JukeboxOperatorStatus> {
  const [state, scan, bridge] = await Promise.all([
    readJukeboxLocalState(),
    scanVdjDatabase(),
    loadJukeboxBridgeStatus(),
  ]);
  const session = activeGig(state);
  const catalogCount = playableCatalogTracks(state, entryMap(scan.entries)).length;
  const requests = session
    ? state.requests.filter((request) => request.jukeboxSessionId === session.sessionId)
    : [];
  return {
    ready: session != null && catalogCount > 0 && bridge.running && bridge.enabled && bridge.localEndpoint,
    guestUiOnline: true,
    requestApiOnline: catalogCount > 0,
    eventTitle: session?.name ?? null,
    isOpen: session?.requestsEnabled === true,
    requestsEnabled: session?.requestsEnabled === true,
    requestsPerGuest: session?.requestLimit ?? state.defaultRequestLimit,
    catalogCount,
    activeSession: session ? mapLiveSession(session) : null,
    activeGuestCount: session
      ? state.guests.filter((guest) => guest.jukeboxSessionId === session.sessionId).length
      : 0,
    requestCount: requests.length,
    pendingCount: requests.filter((request) => request.status === "new").length,
    acceptedCount: requests.filter((request) => request.status === "accepted").length,
    playedCount: requests.filter((request) => request.status === "played").length,
    skippedCount: requests.filter((request) => request.status === "skipped").length,
    ipadUrl: lanUrl(),
    bridge,
    publicRelay: {
      status: state.publicRelay.status,
      lastAttemptAt: state.publicRelay.lastAttemptAt,
      lastSuccessAt: state.publicRelay.lastSuccessAt,
      lastPollAt: state.publicRelay.lastPollAt,
      lastError: state.publicRelay.lastError,
      pendingCount: state.publicRelay.pendingCount,
    },
    storage: {
      authority: "local",
      path: jukeboxLocalStatePath(),
      neonSync: state.sync,
    },
  };
}

export async function resolveJukeboxHeroTrack(trackKeyInput: string): Promise<{
  key: string;
  rvtr: string | null;
  mediaPath: string;
}> {
  const trackKey = trackKeyInput.trim();
  if (!TRACK_KEY_RE.test(trackKey)) throw new JukeboxInputError("invalid", "Invalid video.");
  const state = await readJukeboxLocalState();
  const session = activeGig(state);
  if (!session || !session.requestsEnabled) {
    throw new JukeboxInputError("closed", "The video jukebox is closed right now.");
  }
  const track = state.catalog?.tracks.find((candidate) => candidate.key === trackKey);
  if (!track) throw new JukeboxInputError("stale", "Video not found.");
  return { key: track.key, rvtr: track.rvtr, mediaPath: track.localMediaPath };
}

export type AcceptedBridgeRequest = {
  requestId: number;
  artist: string;
  title: string;
  localMediaPath: string;
  acceptedAt: string;
};

export async function loadJukeboxAcceptedBridgeRequests(): Promise<{
  eventId: string | null;
  generatedAt: string;
  requests: AcceptedBridgeRequest[];
}> {
  const state = await readJukeboxLocalState();
  const session = workingGig(state);
  if (!session) return { eventId: null, generatedAt: new Date().toISOString(), requests: [] };
  return {
    eventId: session.sessionId,
    generatedAt: new Date().toISOString(),
    requests: orderedGigRequests(state, session.sessionId)
      .map((request) => ({
        requestId: request.id,
        artist: request.artist,
        title: request.title,
        localMediaPath: request.localMediaPath,
        acceptedAt: request.requestedAt,
      })),
  };
}
