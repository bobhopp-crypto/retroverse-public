import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

import {
  closeJukeboxRelaySession,
  pollAndIngestPublicJukeboxRequests,
  publishJukeboxRelayControl,
} from "../../packages/shared/lib/song-requests/jukebox-relay-client";
import {
  createJukeboxSession,
  endActiveJukeboxSession,
  ingestPublicJukeboxRequest,
  loadActiveJukeboxSessionIdentity,
  loadJukeboxRelayControlSnapshot,
  refreshJukeboxRequestList,
  setJukeboxRequestsEnabled,
  startNewJukeboxSession,
  submitJukeboxRequest,
} from "../../packages/shared/lib/song-requests/jukebox-local-store";
import { readJukeboxLocalState } from "../../packages/shared/lib/song-requests/jukebox-local-state";
import { jukeboxRequestListPath } from "../../packages/shared/lib/song-requests/jukebox-runtime";
import type {
  PublicJukeboxRelayCatalog,
  PublicJukeboxRelayReceipt,
  PublicJukeboxRelayStatus,
  PublicJukeboxRelayTrack,
} from "../../packages/shared/lib/song-requests/jukebox-relay-types";

const root = process.env.RETROVERSE_DATA_ROOT?.trim() ?? "";
if (!root.startsWith("/private/tmp/retroverse-live-requests-data")) {
  throw new Error("Verification requires the isolated temporary Jukebox data root.");
}

const liveOrigin = process.env.RETROVERSE_LIVE_PUBLIC_URL?.trim() || "http://127.0.0.1:3201";

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`VERIFY FAILED: ${message}`);
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function status(): Promise<PublicJukeboxRelayStatus> {
  return json(await fetch(`${liveOrigin}/api/jukebox-relay/status`, { cache: "no-store" }));
}

async function catalog(sessionToken: string, limit = 10): Promise<PublicJukeboxRelayCatalog> {
  const params = new URLSearchParams({ session: sessionToken, limit: String(limit) });
  return json(await fetch(`${liveOrigin}/api/jukebox-relay/catalog?${params.toString()}`, { cache: "no-store" }));
}

async function publicRequest(input: {
  publicRequestId: string;
  sessionToken: string;
  guestId: string;
  nickname?: string;
  trackKey: string;
}): Promise<PublicJukeboxRelayReceipt> {
  const payload = await json<{ ok: true; receipt: PublicJukeboxRelayReceipt }>(
    await fetch(`${liveOrigin}/api/jukebox-relay/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return payload.receipt;
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

async function expectPublicClosedSubmission(input: Parameters<typeof publicRequest>[0]): Promise<void> {
  const response = await fetch(`${liveOrigin}/api/jukebox-relay/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  check(response.status === 423, `closed public submission returned ${response.status}`);
}

async function waitForRateLimitWindow(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 650));
}

async function requeueDeliveredTestRequest(publicRequestId: string, sessionToken: string): Promise<void> {
  const pool = new Pool({
    host: process.env.RETROVERSE_JUKEBOX_RELAY_PG_HOST,
    port: Number(process.env.RETROVERSE_JUKEBOX_RELAY_PG_PORT || "5432"),
    database: process.env.RETROVERSE_JUKEBOX_RELAY_PG_DATABASE,
    user: process.env.RETROVERSE_JUKEBOX_RELAY_PG_USER,
    password: process.env.RETROVERSE_JUKEBOX_RELAY_PG_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  try {
    const result = await pool.query(
      `UPDATE retroverse_jukebox_relay_requests
          SET status = 'pending', delivered_at = NULL, updated_at = now()
        WHERE public_request_id = $1 AND session_token = $2 AND status = 'delivered'`,
      [publicRequestId, sessionToken],
    );
    check(result.rowCount === 1, "could not stage an intentional relay redelivery");
  } finally {
    await pool.end();
  }
}

async function main() {
  const prior = await loadActiveJukeboxSessionIdentity();
  if (prior) {
    await endActiveJukeboxSession();
    await closeJukeboxRelaySession(prior.publicSessionToken);
  }
  await refreshJukeboxRequestList();
  const initialStatus = await status();
  check(initialStatus.isOpen === false, "public relay must start closed");

  await startNewJukeboxSession("Relay Verification A");
  await refreshJukeboxRequestList();
  const firstSession = await loadActiveJukeboxSessionIdentity();
  check(firstSession && firstSession.requestsEnabled === false, "new session did not default requests OFF");
  const firstSnapshot = await loadJukeboxRelayControlSnapshot(true);
  check(firstSnapshot.catalog?.length === 813, `expected the canonical 813-video snapshot, got ${firstSnapshot.catalog?.length ?? 0}`);
  check((await publishJukeboxRelayControl({ includeCatalog: true })).ok, "closed session did not publish to relay");
  const closedAfterStart = await status();
  check(closedAfterStart.isOpen === false, "starting a session opened public requests");
  check(closedAfterStart.sessionToken === firstSession.publicSessionToken, "public session token mismatch after start");
  await createJukeboxSession().then(
    () => { throw new Error("VERIFY FAILED: local guest session opened while requests were OFF"); },
    () => undefined,
  );

  await setJukeboxRequestsEnabled(true);
  check((await publishJukeboxRelayControl({ includeCatalog: true })).ok, "requests ON did not publish");
  const openStatus = await status();
  check(openStatus.isOpen === true, "public relay did not open");
  const publicCatalog = await catalog(firstSession.publicSessionToken, 8);
  check(publicCatalog.total === 813, `public relay catalog expected 813 videos, got ${publicCatalog.total}`);
  check(publicCatalog.tracks.length >= 5, "public relay did not return enough test tracks");
  const serializedCatalog = JSON.stringify(publicCatalog);
  check(!serializedCatalog.includes("localMediaPath"), "public catalog exposed a local path field");
  check(!serializedCatalog.includes("/Users/"), "public catalog exposed a Mac path");
  check(!serializedCatalog.includes("Bobs-MacBook"), "public catalog exposed a LAN hostname");

  const guestId = randomUUID();
  const firstRequestId = randomUUID();
  const firstTrack = publicCatalog.tracks[0]!;
  const firstReceipt = await publicRequest({
    publicRequestId: firstRequestId,
    sessionToken: firstSession.publicSessionToken,
    guestId,
    nickname: "Relay Guest",
    trackKey: firstTrack.key,
  });
  check(firstReceipt.publicRequestId === firstRequestId, "public request ID was not stable");
  const firstPoll = await pollAndIngestPublicJukeboxRequests();
  check(firstPoll.ok && firstPoll.insertedCount === 1, "Mac did not ingest the first public request exactly once");
  let state = await readJukeboxLocalState();
  let firstLocal = state.requests.find((request) => request.publicRequestId === firstRequestId);
  check(firstLocal && firstLocal.source === "public", "public request did not enter the canonical local ledger");
  let m3u = await readFile(jukeboxRequestListPath(), "utf8");
  check(occurrences(m3u, firstLocal.localMediaPath) === 1, "exact local video was not inserted once into JUKEBOX REQUESTS");

  await requeueDeliveredTestRequest(firstRequestId, firstSession.publicSessionToken);
  const relayRetry = await pollAndIngestPublicJukeboxRequests();
  check(relayRetry.ok && relayRetry.insertedCount === 0, "intentional relay redelivery inserted a duplicate");
  state = await readJukeboxLocalState();
  check(state.requests.filter((request) => request.publicRequestId === firstRequestId).length === 1, "relay redelivery duplicated the ledger row");
  m3u = await readFile(jukeboxRequestListPath(), "utf8");
  check(occurrences(m3u, firstLocal.localMediaPath) === 1, "relay redelivery duplicated the M3U entry");

  const duplicateReceipt = await publicRequest({
    publicRequestId: firstRequestId,
    sessionToken: firstSession.publicSessionToken,
    guestId,
    nickname: "Relay Guest",
    trackKey: firstTrack.key,
  });
  check(duplicateReceipt.duplicate, "relay retry did not retain the stable request ID");
  const directRetry = await ingestPublicJukeboxRequest({
    publicRequestId: firstRequestId,
    sessionToken: firstSession.publicSessionToken,
    guestId,
    nickname: "Relay Guest",
    trackKey: firstTrack.key,
    artist: firstTrack.artist,
    title: firstTrack.title,
    year: firstTrack.year,
    requestedAt: firstReceipt.requestedAt,
  });
  check(!directRetry.inserted && directRetry.acknowledgement.result === "delivered", "local retry was not idempotent");
  state = await readJukeboxLocalState();
  check(state.requests.filter((request) => request.publicRequestId === firstRequestId).length === 1, "local retry duplicated the ledger row");
  m3u = await readFile(jukeboxRequestListPath(), "utf8");
  check(occurrences(m3u, firstLocal.localMediaPath) === 1, "local retry duplicated the M3U entry");

  const extraTracks: PublicJukeboxRelayTrack[] = publicCatalog.tracks.slice(1, 4);
  for (const track of extraTracks) {
    await waitForRateLimitWindow();
    await publicRequest({
      publicRequestId: randomUUID(),
      sessionToken: firstSession.publicSessionToken,
      guestId,
      nickname: "Relay Guest",
      trackKey: track.key,
    });
  }
  const batchPoll = await pollAndIngestPublicJukeboxRequests();
  check(batchPoll.ok && batchPoll.insertedCount === extraTracks.length, "several requests from one public guest did not ingest");

  const beforeOff = await readFile(jukeboxRequestListPath(), "utf8");
  await setJukeboxRequestsEnabled(false);
  check((await publishJukeboxRelayControl({ includeCatalog: false })).ok, "requests OFF did not publish");
  check((await status()).isOpen === false, "public relay remained open after requests OFF");
  await expectPublicClosedSubmission({
    publicRequestId: randomUUID(),
    sessionToken: firstSession.publicSessionToken,
    guestId,
    trackKey: publicCatalog.tracks[4]!.key,
  });
  await createJukeboxSession().then(
    () => { throw new Error("VERIFY FAILED: local iPad path accepted while requests were OFF"); },
    () => undefined,
  );
  check((await readFile(jukeboxRequestListPath(), "utf8")) === beforeOff, "requests OFF changed JUKEBOX REQUESTS");

  await setJukeboxRequestsEnabled(true);
  check((await publishJukeboxRelayControl({ includeCatalog: false })).ok, "requests ON recovery did not publish");
  check((await status()).isOpen === true, "public relay did not recover after requests ON");

  await endActiveJukeboxSession();
  check((await closeJukeboxRelaySession(firstSession.publicSessionToken)).ok, "ending the first session did not close relay");
  check((await status()).isOpen === false, "public relay remained open after session end");

  await startNewJukeboxSession("Relay Verification B");
  await refreshJukeboxRequestList();
  const secondSession = await loadActiveJukeboxSessionIdentity();
  check(secondSession && secondSession.publicSessionToken !== firstSession.publicSessionToken, "second session reused public token");
  check(secondSession.requestsEnabled === false, "second session did not default requests OFF");
  check((await publishJukeboxRelayControl({ includeCatalog: true })).ok, "second closed session did not publish");
  const stale = await ingestPublicJukeboxRequest({
    publicRequestId: randomUUID(),
    sessionToken: firstSession.publicSessionToken,
    guestId,
    nickname: null,
    trackKey: firstTrack.key,
    artist: firstTrack.artist,
    title: firstTrack.title,
    year: firstTrack.year,
    requestedAt: new Date().toISOString(),
  });
  check(stale.acknowledgement.result === "rejected" && !stale.inserted, "old-session request entered the new session");

  await setJukeboxRequestsEnabled(true);
  const approvedOrigin = process.env.RETROVERSE_LIVE_PUBLIC_URL;
  process.env.RETROVERSE_LIVE_PUBLIC_URL = "http://127.0.0.1:39999";
  const failedRelay = await publishJukeboxRelayControl({ includeCatalog: false });
  check(!failedRelay.ok, "relay failure simulation unexpectedly succeeded");
  const localGuest = await createJukeboxSession("Offline Local Guest");
  const localReceipt = await submitJukeboxRequest({
    sessionId: localGuest.sessionId,
    catalogTrackKey: firstTrack.key,
  });
  check(localReceipt.duplicate === false, "local offline request was not inserted");
  state = await readJukeboxLocalState();
  const localRow = state.requests.find((request) => request.id === localReceipt.requestId);
  check(localRow?.source === "local", "local offline request missed the canonical ledger");
  m3u = await readFile(jukeboxRequestListPath(), "utf8");
  check(localRow && occurrences(m3u, localRow.localMediaPath) === 1, "local offline request missed JUKEBOX REQUESTS");
  process.env.RETROVERSE_LIVE_PUBLIC_URL = approvedOrigin;
  await endActiveJukeboxSession();
  await closeJukeboxRelaySession(secondSession.publicSessionToken);

  const finalState = await readJukeboxLocalState();
  check(!finalState.sessions.some((session) => session.status === "active" && !session.endedAt), "verification left an active session");
  console.log(JSON.stringify({
    ok: true,
    catalogCount: publicCatalog.total,
    publicRequestsIngested: 1 + extraTracks.length,
    idempotent: true,
    relayRedelivery: true,
    sessionIsolation: true,
    localOfflineRequest: true,
    activeSessionsAfterTest: 0,
  }));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
