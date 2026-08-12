import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";

import { getPassPool, passQuery } from "../packages/shared/lib/retroverse-pass/pg";

const LIVE = "http://127.0.0.1:3100";
const STUDIO = "http://127.0.0.1:3000";
const TEST_PASS = "RETROVERSE-REQUEST-TEST-20260802";
const TEST_EMAIL = "retroverse-request-test-20260802@invalid.local";
const STATE_PATH = ".runtime/song-request-e2e.json";

type TestState = {
  passSerial: string;
  visitorId: number;
  eventId: string;
  firstRequestId: number;
  firstTrackKey: string;
  secondTrackKey: string;
};

type CatalogTrack = { key: string; artist: string; title: string; year: number | null };

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return payload;
}

async function operatorCookie(): Promise<string> {
  const auth = await fetch(`${STUDIO}/api/internal/ops-auth`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ pin: process.env.RETROVERSE_OPS_PIN?.trim() || "6324" }),
  });
  assert.equal(auth.status, 200, "operator authentication must succeed");
  const cookie = auth.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert(cookie, "operator authentication must issue a cookie");
  return cookie;
}

async function loadState(): Promise<TestState> {
  return JSON.parse(await readFile(STATE_PATH, "utf8")) as TestState;
}

async function saveState(state: TestState): Promise<void> {
  await mkdir(".runtime", { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function setup(): Promise<void> {
  const active = await passQuery<{
    event_id: string;
    source_label: string;
    eligible_track_count: number | string;
  }>(`
    SELECT e.event_id, s.source_label, s.eligible_track_count
    FROM retroverse_request_events e
    JOIN retroverse_request_sources s
      ON s.event_id = e.event_id AND s.deactivated_at IS NULL
    WHERE e.is_active = true
    LIMIT 1
  `);
  assert.equal(active[0]?.source_label, "VIDEO/1960's", "VIDEO/1960's must be active");
  assert.equal(Number(active[0]?.eligible_track_count), 813, "active catalog must contain 813 tracks");

  const existing = await passQuery<{ visitor_id: number | string | null }>(
    `SELECT visitor_id FROM retroverse_passes WHERE serial = $1`,
    [TEST_PASS],
  );
  assert.equal(existing.length, 0, `${TEST_PASS} has already been used; choose a fresh designated test pass`);

  const claim = await responseJson<{
    visitor: { id: number; firstName: string; email: string | null };
  }>(await fetch(`${LIVE}/api/pass/claim`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      serial: TEST_PASS,
      firstName: "Request Test",
      lastName: "Do Not Contact",
      email: TEST_EMAIL,
      marketingOptIn: false,
    }),
  }));
  assert.equal(claim.visitor.firstName, "Request Test");
  assert.equal(claim.visitor.email, TEST_EMAIL);

  const initialState = await responseJson<{ canRequest: boolean }>(
    await fetch(`${LIVE}/api/pass/song-request?serial=${encodeURIComponent(TEST_PASS)}`),
  );
  assert.equal(initialState.canRequest, true, "fresh test pass must have one request available");

  const catalog = await responseJson<{ tracks: CatalogTrack[] }>(
    await fetch(`${LIVE}/api/pass/song-request/catalog?serial=${encodeURIComponent(TEST_PASS)}&q=Beatles&sort=title`),
  );
  assert(catalog.tracks.length >= 2, "test requires at least two Beatles tracks");

  const catalogRows = await passQuery<{
    public_key: string;
    source_path_snapshot: string;
  }>(`
    SELECT t.public_key, t.source_path_snapshot
    FROM retroverse_request_catalog_tracks t
    JOIN retroverse_request_sources s ON s.id = t.source_id AND s.deactivated_at IS NULL
    JOIN retroverse_request_events e ON e.event_id = t.event_id AND e.is_active = true
    WHERE t.public_key = ANY($1::text[])
  `, [catalog.tracks.map((track) => track.key)]);
  const pathByKey = new Map(catalogRows.map((row) => [row.public_key, row.source_path_snapshot]));
  const usable: CatalogTrack[] = [];
  for (const track of catalog.tracks) {
    const path = pathByKey.get(track.key);
    if (!path) continue;
    try {
      await access(path);
      usable.push(track);
    } catch {
      // The acceptance test must use playable local media only.
    }
    if (usable.length === 2) break;
  }
  assert.equal(usable.length, 2, "test requires two catalog tracks with readable local media");

  const submissions = await Promise.all(usable.map((track, index) => fetch(`${LIVE}/api/pass/song-request`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      serial: TEST_PASS,
      catalogTrackKey: track.key,
      guestComment: `Designated end-to-end test request ${index + 1}.`,
    }),
  })));
  const statuses = submissions.map((response) => response.status).sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 409], "two concurrent submissions must produce one success and one allowance rejection");
  const winnerIndex = submissions.findIndex((response) => response.status === 200);
  assert(winnerIndex >= 0);
  await Promise.all(submissions.map((response) => response.json()));

  const afterState = await responseJson<{ canRequest: boolean }>(
    await fetch(`${LIVE}/api/pass/song-request?serial=${encodeURIComponent(TEST_PASS)}`),
  );
  assert.equal(afterState.canRequest, false, "test pass must not receive a second request without replenishment");

  const persisted = await passQuery<{
    id: number | string;
    event_id: string;
    visitor_id: number | string;
    pass_serial: string;
    catalog_track_id: number | string;
    rvtr: string | null;
    virtualdj_track_identity: string;
    source_path_snapshot: string;
    selected_source_label: string;
    source_relative_path: string | null;
    pass_visitor_id: number | string;
    catalog_event_id: string;
    catalog_rvtr: string | null;
    catalog_virtualdj_track_identity: string;
    catalog_source_path: string;
    catalog_source_label: string;
    catalog_source_relative_path: string | null;
  }>(`
    SELECT r.id, r.event_id, r.visitor_id, r.pass_serial, r.catalog_track_id,
           r.rvtr, r.virtualdj_track_identity, r.source_path_snapshot,
           r.selected_source_label, r.source_relative_path,
           p.visitor_id AS pass_visitor_id,
           t.event_id AS catalog_event_id, t.rvtr AS catalog_rvtr,
           t.virtualdj_track_identity AS catalog_virtualdj_track_identity,
           t.source_path_snapshot AS catalog_source_path,
           t.selected_source_label AS catalog_source_label,
           t.source_relative_path AS catalog_source_relative_path
    FROM retroverse_song_requests r
    JOIN retroverse_passes p ON p.serial = r.pass_serial
    JOIN retroverse_request_catalog_tracks t ON t.id = r.catalog_track_id
    WHERE r.pass_serial = $1
  `, [TEST_PASS]);
  assert.equal(persisted.length, 1, "exactly one request must be permanently stored");
  const request = persisted[0]!;
  assert.equal(Number(request.visitor_id), claim.visitor.id);
  assert.equal(Number(request.pass_visitor_id), claim.visitor.id);
  assert.equal(request.event_id, active[0]!.event_id);
  assert.equal(request.catalog_event_id, request.event_id);
  assert.equal(request.rvtr, request.catalog_rvtr);
  assert.equal(request.virtualdj_track_identity, request.catalog_virtualdj_track_identity);
  assert.equal(request.source_path_snapshot, request.catalog_source_path);
  assert.equal(request.selected_source_label, request.catalog_source_label);
  assert.equal(request.source_relative_path, request.catalog_source_relative_path);
  await access(request.source_path_snapshot);

  const allowance = await passQuery<{ allowance: number | string; used_count: number | string }>(
    `SELECT allowance, used_count FROM retroverse_request_allowances WHERE event_id = $1 AND pass_serial = $2 AND visitor_id = $3`,
    [request.event_id, TEST_PASS, claim.visitor.id],
  );
  assert.deepEqual(
    { allowance: Number(allowance[0]?.allowance), used: Number(allowance[0]?.used_count) },
    { allowance: 1, used: 1 },
  );

  const cookie = await operatorCookie();
  const dashboard = await responseJson<{ requests: Array<{ id: number; guestComment: string | null }> }>(
    await fetch(`${STUDIO}/api/ops/song-requests`, { headers: { Cookie: cookie } }),
  );
  const operatorRequest = dashboard.requests.find((item) => item.id === Number(request.id));
  assert(operatorRequest, "operator feed must include the designated test request");
  assert.match(operatorRequest.guestComment ?? "", /^Designated end-to-end test request/);

  const unauthenticatedBridge = await fetch(`${LIVE}/api/song-requests/accepted`);
  assert.equal(unauthenticatedBridge.status, 401, "accepted-request feed must reject missing authentication");

  const bridgeToken = process.env.RETROVERSE_REQUEST_BRIDGE_TOKEN?.trim() ?? "";
  assert(bridgeToken, "local bridge token must be configured");
  const bridge = await responseJson<{ requests: Array<{ requestId: number }> }>(
    await fetch(`${LIVE}/api/song-requests/accepted`, {
      headers: { Authorization: `Bearer ${bridgeToken}` },
    }),
  );
  assert.equal(bridge.requests.some((item) => item.requestId === Number(request.id)), false);

  const testState: TestState = {
    passSerial: TEST_PASS,
    visitorId: claim.visitor.id,
    eventId: request.event_id,
    firstRequestId: Number(request.id),
    firstTrackKey: usable[winnerIndex]!.key,
    secondTrackKey: usable[winnerIndex === 0 ? 1 : 0]!.key,
  };
  await saveState(testState);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    testPass: TEST_PASS,
    eventId: testState.eventId,
    requestId: testState.firstRequestId,
    concurrencyStatuses: statuses,
    allowance: { allowance: 1, usedCount: 1 },
    source: active[0]!.source_label,
    eligibleTracks: Number(active[0]!.eligible_track_count),
    permanentIdentity: true,
    operatorVisible: true,
    bridgeAuth: { missingTokenStatus: unauthenticatedBridge.status, configuredTokenStatus: 200 },
  }, null, 2)}\n`);
}

async function submitSecond(): Promise<void> {
  const state = await loadState();
  const guestState = await responseJson<{ canRequest: boolean }>(
    await fetch(`${LIVE}/api/pass/song-request?serial=${encodeURIComponent(state.passSerial)}`),
  );
  assert.equal(guestState.canRequest, true, "REPLENISH must silently restore one request opportunity");
  const response = await fetch(`${LIVE}/api/pass/song-request`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      serial: state.passSerial,
      catalogTrackKey: state.secondTrackKey,
      guestComment: "Designated end-to-end test request 2 after replenishment.",
    }),
  });
  assert.equal(response.status, 200, "the replenished request must be accepted");
  await response.json();
  const rows = await passQuery<{ id: number | string }>(
    `SELECT id FROM retroverse_song_requests WHERE event_id = $1 AND visitor_id = $2 ORDER BY requested_at ASC`,
    [state.eventId, state.visitorId],
  );
  assert.equal(rows.length, 2, "replenishment must preserve the first request and add a second");
  const allowance = await passQuery<{ allowance: number | string; used_count: number | string }>(
    `SELECT allowance, used_count FROM retroverse_request_allowances WHERE event_id = $1 AND pass_serial = $2 AND visitor_id = $3`,
    [state.eventId, state.passSerial, state.visitorId],
  );
  assert.deepEqual(
    { allowance: Number(allowance[0]?.allowance), used: Number(allowance[0]?.used_count) },
    { allowance: 2, used: 2 },
  );
  const next = { ...state, secondRequestId: Number(rows[1]!.id) };
  await writeFile(STATE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    ok: true,
    testPass: state.passSerial,
    firstRequestPreserved: true,
    requestCount: 2,
    allowance: { allowance: 2, usedCount: 2 },
    secondRequestId: Number(rows[1]!.id),
  }, null, 2)}\n`);
}

async function verifyFinal(): Promise<void> {
  const state = await loadState() as TestState & { secondRequestId: number };
  const requests = await passQuery<{
    id: number | string;
    status: string;
    dj_response: string | null;
    source_path_snapshot: string;
  }>(`
    SELECT id, status, dj_response, source_path_snapshot
    FROM retroverse_song_requests
    WHERE event_id = $1 AND visitor_id = $2 AND pass_serial = $3
    ORDER BY requested_at ASC
  `, [state.eventId, state.visitorId, state.passSerial]);
  assert(requests.length >= 2);
  const first = requests.find((request) => Number(request.id) === state.firstRequestId);
  const second = requests.find((request) => Number(request.id) === state.secondRequestId);
  assert.equal(first?.status, "played");
  assert.equal(second?.status, "skipped");
  assert(requests.some((request) => request.dj_response), "RESPOND must persist on a test request");
  await Promise.all(requests.map((request) => access(request.source_path_snapshot)));

  const bridgeToken = process.env.RETROVERSE_REQUEST_BRIDGE_TOKEN?.trim() ?? "";
  const bridge = await responseJson<{ requests: Array<{ requestId: number }> }>(
    await fetch(`${LIVE}/api/song-requests/accepted`, {
      headers: { Authorization: `Bearer ${bridgeToken}` },
    }),
  );
  assert.equal(bridge.requests.some((item) => item.requestId === Number(requests[0]!.id)), false);
  assert.equal(bridge.requests.some((item) => item.requestId === Number(requests[1]!.id)), false);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    testPass: state.passSerial,
    statuses: requests.map((request) => ({ id: Number(request.id), status: request.status })),
    responsePersisted: true,
    exactLocalPathsStillReadable: true,
    activeBridgeRequestsForTestPass: 0,
  }, null, 2)}\n`);
}

async function verifyPerPassAllowance(): Promise<void> {
  const state = await loadState() as TestState & { secondRequestId: number };
  const cookie = await operatorCookie();
  const replenished = await fetch(`${STUDIO}/api/ops/song-requests`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Cookie: cookie },
    body: JSON.stringify({ requestId: state.firstRequestId, action: "replenish" }),
  });
  assert.equal(replenished.status, 200, "private REPLENISH must succeed");

  const attempts = await Promise.all([0, 1].map((index) => fetch(`${LIVE}/api/pass/song-request`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      serial: state.passSerial,
      catalogTrackKey: state.secondTrackKey,
      guestComment: `Post-migration per-pass concurrency check ${index + 1}.`,
    }),
  })));
  const statuses = attempts.map((response) => response.status).sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 409], "one replenished pass opportunity must permit only one concurrent winner");
  await Promise.all(attempts.map((response) => response.json()));

  const latest = await passQuery<{
    id: number | string;
    event_id: string;
    visitor_id: number | string;
    pass_serial: string;
    status: string;
  }>(`
    SELECT id, event_id, visitor_id, pass_serial, status
    FROM retroverse_song_requests
    WHERE event_id = $1 AND pass_serial = $2 AND visitor_id = $3
    ORDER BY requested_at DESC
    LIMIT 1
  `, [state.eventId, state.passSerial, state.visitorId]);
  assert.equal(latest[0]?.status, "new");

  const skipped = await fetch(`${STUDIO}/api/ops/song-requests`, {
    method: "PATCH",
    headers: { ...jsonHeaders(), Cookie: cookie },
    body: JSON.stringify({ requestId: Number(latest[0]!.id), action: "skip" }),
  });
  assert.equal(skipped.status, 200, "test cleanup must move the extra request to a terminal status");

  const allowance = await passQuery<{
    allowance: number | string;
    used_count: number | string;
    definition: string;
  }>(`
    SELECT a.allowance, a.used_count,
           pg_get_constraintdef(c.oid) AS definition
    FROM retroverse_request_allowances a
    CROSS JOIN pg_constraint c
    WHERE a.event_id = $1 AND a.pass_serial = $2 AND a.visitor_id = $3
      AND c.conrelid = 'retroverse_request_allowances'::regclass
      AND c.contype = 'p'
  `, [state.eventId, state.passSerial, state.visitorId]);
  assert.equal(allowance[0]?.definition, "PRIMARY KEY (event_id, pass_serial)");
  assert.deepEqual(
    { allowance: Number(allowance[0]?.allowance), used: Number(allowance[0]?.used_count) },
    { allowance: 3, used: 3 },
  );

  process.stdout.write(`${JSON.stringify({
    ok: true,
    testPass: state.passSerial,
    allowancePrimaryKey: allowance[0]!.definition,
    concurrentStatuses: statuses,
    allowance: { allowance: 3, usedCount: 3 },
    extraRequestFinalStatus: "skipped",
  }, null, 2)}\n`);
}

async function main() {
  loadEnvFile(".env.local");
  const phase = process.argv[2] ?? "setup";
  try {
    if (phase === "setup") await setup();
    else if (phase === "submit-second") await submitSecond();
    else if (phase === "verify-final") await verifyFinal();
    else if (phase === "verify-per-pass") await verifyPerPassAllowance();
    else throw new Error(`Unknown phase: ${phase}`);
  } finally {
    await getPassPool().end();
  }
}

void main();
