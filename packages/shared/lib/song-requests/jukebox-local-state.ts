import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import type { RequestSourceKind, RequestStatus } from "./types";

export const JUKEBOX_LOCAL_STATE_VERSION = 1;

export type LocalJukeboxCatalogTrack = {
  catalogTrackId: number;
  key: string;
  rvtr: string | null;
  virtualDjTrackIdentity: string;
  artist: string;
  title: string;
  year: number | null;
  localMediaPath: string;
  selectedSourceLabel: string;
  sourceRelativePath: string | null;
};

export type LocalJukeboxCatalog = {
  eventId: string;
  title: string;
  sourceKind: RequestSourceKind;
  sourceKey: string | null;
  sourceLabel: string;
  capturedAt: string;
  tracks: LocalJukeboxCatalogTrack[];
};

export type LocalJukeboxGigSession = {
  sessionId: string;
  publicSessionToken: string;
  catalogEventId: string;
  name: string;
  sessionDate: string;
  status: "active" | "ended";
  requestsEnabled: boolean;
  requestLimit: number | null;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
};

export type LocalJukeboxGuestSession = {
  sessionId: string;
  eventId: string;
  jukeboxSessionId: string;
  source: "local" | "public";
  publicGuestId: string | null;
  guestNumber: number;
  nickname: string | null;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
};

export type LocalJukeboxRequest = {
  id: number;
  syncId: string;
  neonRequestId: number | null;
  eventId: string;
  jukeboxSessionId: string;
  requesterSessionId: string;
  source: "local" | "public";
  publicRequestId: string | null;
  catalogTrackId: number;
  catalogTrackKey: string;
  rvtr: string | null;
  virtualDjTrackIdentity: string;
  artist: string;
  title: string;
  year: number | null;
  localMediaPath: string;
  selectedSourceLabel: string;
  sourceRelativePath: string | null;
  guestComment: string | null;
  status: RequestStatus;
  djResponse: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  playedAt: string | null;
  skippedAt: string | null;
  respondedAt: string | null;
  updatedAt: string;
};

export type LocalJukeboxSyncState = {
  importedFromNeonAt: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type LocalJukeboxRelayReceipt = {
  publicRequestId: string;
  publicSessionToken: string;
  localRequestId: number | null;
  result: "inserted" | "duplicate" | "rejected";
  detail: string | null;
  receivedAt: string;
};

export type LocalJukeboxPublicRelayState = {
  status: "closed" | "open" | "error";
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastPollAt: string | null;
  lastError: string | null;
  pendingCount: number;
  receipts: LocalJukeboxRelayReceipt[];
};

export type LocalJukeboxState = {
  version: typeof JUKEBOX_LOCAL_STATE_VERSION;
  updatedAt: string;
  catalog: LocalJukeboxCatalog | null;
  defaultRequestLimit: number | null;
  nextRequestId: number;
  sessions: LocalJukeboxGigSession[];
  guests: LocalJukeboxGuestSession[];
  requests: LocalJukeboxRequest[];
  sync: LocalJukeboxSyncState;
  publicRelay: LocalJukeboxPublicRelayState;
};

type JukeboxGlobal = typeof globalThis & {
  __retroverseJukeboxMutation?: Promise<void>;
};

function emptyState(): LocalJukeboxState {
  return {
    version: JUKEBOX_LOCAL_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    catalog: null,
    defaultRequestLimit: null,
    nextRequestId: 1,
    sessions: [],
    guests: [],
    requests: [],
    sync: {
      importedFromNeonAt: null,
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
}

export function jukeboxLocalStatePath(): string {
  return join(retroverseDataRoot(), "bobos", "video-jukebox", "state.json");
}

function validateState(value: unknown): LocalJukeboxState {
  if (!value || typeof value !== "object") throw new Error("The local jukebox state is invalid.");
  const state = value as Partial<LocalJukeboxState>;
  if (
    state.version !== JUKEBOX_LOCAL_STATE_VERSION ||
    !Array.isArray(state.sessions) ||
    !Array.isArray(state.guests) ||
    !Array.isArray(state.requests) ||
    !state.sync ||
    typeof state.nextRequestId !== "number"
  ) {
    throw new Error("The local jukebox state version is unsupported.");
  }
  const normalized = state as LocalJukeboxState;
  normalized.sessions = normalized.sessions.map((session) => ({
    ...session,
    publicSessionToken:
      typeof session.publicSessionToken === "string" ? session.publicSessionToken : session.sessionId,
    requestsEnabled: session.requestsEnabled === true,
  }));
  normalized.guests = normalized.guests.map((guest) => ({
    ...guest,
    source: guest.source === "public" ? "public" : "local",
    publicGuestId: typeof guest.publicGuestId === "string" ? guest.publicGuestId : null,
  }));
  normalized.requests = normalized.requests.map((request) => ({
    ...request,
    source: request.source === "public" ? "public" : "local",
    publicRequestId: typeof request.publicRequestId === "string" ? request.publicRequestId : null,
  }));
  normalized.publicRelay = normalized.publicRelay && Array.isArray(normalized.publicRelay.receipts)
    ? normalized.publicRelay
    : {
        status: "closed",
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastPollAt: null,
        lastError: null,
        pendingCount: 0,
        receipts: [],
      };
  return normalized;
}

export async function readJukeboxLocalState(): Promise<LocalJukeboxState> {
  try {
    return validateState(JSON.parse(await readFile(jukeboxLocalStatePath(), "utf8")));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyState();
    throw error;
  }
}

async function writeState(state: LocalJukeboxState): Promise<void> {
  const path = jukeboxLocalStatePath();
  const directory = dirname(path);
  const temporary = join(directory, `.state.${process.pid}.${Date.now()}.tmp`);
  await mkdir(directory, { recursive: true });
  await copyFile(path, join(directory, "state.backup.json")).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

export async function replaceJukeboxLocalState(state: LocalJukeboxState): Promise<void> {
  validateState(state);
  await writeState(state);
}

export async function mutateJukeboxLocalState<T>(
  mutation: (state: LocalJukeboxState) => T | Promise<T>,
): Promise<T> {
  const globalState = globalThis as JukeboxGlobal;
  const previous = globalState.__retroverseJukeboxMutation ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  globalState.__retroverseJukeboxMutation = previous.catch(() => undefined).then(() => gate);
  await previous.catch(() => undefined);
  try {
    const state = await readJukeboxLocalState();
    const result = await mutation(state);
    state.updatedAt = new Date().toISOString();
    await writeState(state);
    return result;
  } finally {
    release();
  }
}
