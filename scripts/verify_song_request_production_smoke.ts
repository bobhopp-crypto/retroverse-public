import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";

import { getPassPool, passQuery } from "../packages/shared/lib/retroverse-pass/pg";

const PRODUCTION = "https://retroverse.live";
const STUDIO = "http://127.0.0.1:3000";
const TEST_PASS = "RETROVERSE-REQUEST-TEST-20260802";
const MARKER = "PRODUCTION SMOKE TEST — deployment e824c91c0.";
const STATE_PATH = ".runtime/song-request-production-smoke.json";

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return payload;
}

async function operatorCookie(): Promise<string> {
  const auth = await fetch(`${STUDIO}/api/internal/ops-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: process.env.RETROVERSE_OPS_PIN?.trim() || "6324" }),
  });
  assert.equal(auth.status, 200);
  const cookie = auth.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert(cookie);
  return cookie;
}

async function operatorAction(requestId: number, action: "accept" | "played" | "skip" | "replenish") {
  const response = await fetch(`${STUDIO}/api/ops/song-requests`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: await operatorCookie() },
    body: JSON.stringify({ requestId, action }),
  });
  assert.equal(response.status, 200, `${action} failed`);
}

async function submit() {
  const existing = await passQuery<{ id: number | string }>(
    `SELECT id FROM retroverse_song_requests WHERE guest_comment = $1`,
    [MARKER],
  );
  assert.equal(existing.length, 0, "production smoke marker already exists");

  let state = await json<{ canRequest: boolean; catalogName: string; availableSongCount: number }>(
    await fetch(`${PRODUCTION}/api/pass/song-request?serial=${encodeURIComponent(TEST_PASS)}`),
  );
  if (!state.canRequest) {
    await operatorAction(1, "replenish");
    state = await json(await fetch(
      `${PRODUCTION}/api/pass/song-request?serial=${encodeURIComponent(TEST_PASS)}`,
    ));
  }
  assert.equal(state.canRequest, true);
  assert.equal(state.catalogName, "1960s Video Collection");
  assert.equal(state.availableSongCount, 813);

  const catalog = await json<{
    total: number;
    tracks: Array<{ key: string; artist: string; title: string; year: number | null }>;
  }>(await fetch(
    `${PRODUCTION}/api/pass/song-request/catalog?serial=${encodeURIComponent(TEST_PASS)}&q=Beatles&sort=title`,
  ));
  assert(catalog.total > 0 && catalog.tracks.length > 1);
  assert.deepEqual(Object.keys(catalog.tracks[0]!).sort(), ["artist", "key", "title", "year"]);

  const track = catalog.tracks[0]!;
  const trackRows = await passQuery<{ source_path_snapshot: string }>(
    `SELECT source_path_snapshot FROM retroverse_request_catalog_tracks WHERE public_key = $1`,
    [track.key],
  );
  await access(trackRows[0]!.source_path_snapshot);

  const bodies = [MARKER, `${MARKER} duplicate`];
  const attempts = await Promise.all(bodies.map((guestComment) => fetch(
    `${PRODUCTION}/api/pass/song-request`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial: TEST_PASS, catalogTrackKey: track.key, guestComment }),
    },
  )));
  const statuses = attempts.map((response) => response.status).sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 409]);
  await Promise.all(attempts.map((response) => response.json()));

  const rows = await passQuery<{
    id: number | string;
    status: string;
    event_id: string;
    visitor_id: number | string;
    pass_serial: string;
    source_path_snapshot: string;
    virtualdj_track_identity: string;
  }>(`
    SELECT id, status, event_id, visitor_id, pass_serial,
           source_path_snapshot, virtualdj_track_identity
    FROM retroverse_song_requests
    WHERE guest_comment = $1
  `, [MARKER]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.status, "new");
  assert.equal(rows[0]!.pass_serial, TEST_PASS);
  assert.equal(rows[0]!.source_path_snapshot, rows[0]!.virtualdj_track_identity);
  await access(rows[0]!.source_path_snapshot);

  const dashboard = await json<{ requests: Array<{ id: number }> }>(
    await fetch(`${STUDIO}/api/ops/song-requests`, { headers: { Cookie: await operatorCookie() } }),
  );
  assert(dashboard.requests.some((request) => request.id === Number(rows[0]!.id)));

  await mkdir(".runtime", { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify({
    requestId: Number(rows[0]!.id),
    eventId: rows[0]!.event_id,
    artist: track.artist,
    title: track.title,
    localMediaPath: rows[0]!.source_path_snapshot,
  }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    requestId: Number(rows[0]!.id),
    eventId: rows[0]!.event_id,
    catalogName: state.catalogName,
    productionCatalogCount: state.availableSongCount,
    concurrentStatuses: statuses,
    operatorVisible: true,
    exactLocalPathReadable: true,
    track: { artist: track.artist, title: track.title, year: track.year },
  }, null, 2)}\n`);
}

async function action(actionName: "accept" | "played" | "skip") {
  const state = JSON.parse(await readFile(STATE_PATH, "utf8")) as { requestId: number };
  await operatorAction(state.requestId, actionName);
  const rows = await passQuery<{ status: string }>(
    `SELECT status FROM retroverse_song_requests WHERE id = $1`,
    [state.requestId],
  );
  assert.equal(rows[0]?.status, actionName === "accept" ? "accepted" : actionName);
  process.stdout.write(`${JSON.stringify({ ok: true, requestId: state.requestId, status: rows[0]!.status })}\n`);
}

async function main() {
  loadEnvFile(".env.local");
  try {
    const phase = process.argv[2];
    if (phase === "submit") await submit();
    else if (phase === "accept" || phase === "played" || phase === "skip") await action(phase);
    else throw new Error("Use submit, accept, played, or skip");
  } finally {
    await getPassPool().end();
  }
}

void main();
