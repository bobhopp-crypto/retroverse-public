/**
 * Proof-of-concept probe for VirtualDJ Network Control plugin.
 * Does NOT modify Retroverse or VDJ — read-only queries.
 *
 * Prerequisites:
 *   - VirtualDJ 2023+ with Pro license
 *   - Network Control plugin installed + enabled (note port in settings)
 *
 * Usage:
 *   VDJ_NETWORK_PORT=8088 npx tsx tools/sunday-nights/probe-vdj-network-control.ts
 *   VDJ_NETWORK_BEARER=secret npx tsx tools/sunday-nights/probe-vdj-network-control.ts
 */
const PORT = process.env.VDJ_NETWORK_PORT?.trim() || "80";
const BEARER = process.env.VDJ_NETWORK_BEARER?.trim() || "";
const BASE = `http://127.0.0.1:${PORT}`;

const QUERIES: { label: string; script: string }[] = [
  { label: "clock", script: "get_clock" },
  { label: "deck_count", script: "get_decks" },
  { label: "left_deck", script: "get_leftdeck" },
  { label: "right_deck", script: "get_rightdeck" },
  { label: "crossfader_result", script: "get_crossfader_result" },
  { label: "automix_cf", script: "get_automix" },
  { label: "d1_filepath", script: "deck 1 get_filepath" },
  { label: "d2_filepath", script: "deck 2 get_filepath" },
  { label: "d1_artist", script: "deck 1 get_artist" },
  { label: "d1_title", script: "deck 1 get_title" },
  { label: "d2_artist", script: "deck 2 get_artist" },
  { label: "d2_title", script: "deck 2 get_title" },
  { label: "d1_audible", script: "deck 1 is_audible" },
  { label: "d2_audible", script: "deck 2 is_audible" },
  { label: "d1_elapsed_ms", script: "deck 1 get_time elapsed" },
  { label: "d2_elapsed_ms", script: "deck 2 get_time elapsed" },
  { label: "d1_position_pct", script: "deck 1 get_position" },
  { label: "automix_next_title", script: "get_automix_song 'title'" },
];

async function query(script: string): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${BASE}/query?script=${encodeURIComponent(script)}`;
  const headers: Record<string, string> = {};
  if (BEARER) headers.Authorization = `Bearer ${BEARER}`;

  try {
    const res = await fetch(url, { headers });
    const body = (await res.text()).trim();
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

async function main() {
  console.log(`Probing VirtualDJ Network Control at ${BASE}\n`);

  const results: Record<string, { status: number; body: string }> = {};
  let reachable = false;

  for (const q of QUERIES) {
    const r = await query(q.script);
    results[q.label] = { status: r.status, body: r.body };
    if (r.ok && r.status === 200) reachable = true;
    console.log(`[${q.label}] ${q.script}`);
    console.log(`  → ${r.status} ${r.body.slice(0, 200)}${r.body.length > 200 ? "…" : ""}\n`);
  }

  console.log(
    JSON.stringify(
      {
        reachable,
        base: BASE,
        results,
        automixTestHint:
          "Run AutoMix A→B and re-run this script every 1s to compare d1/d2 is_audible + filepaths.",
      },
      null,
      2,
    ),
  );

  if (!reachable) {
    console.error(
      "\nVDJ not reachable. Enable Network Control plugin and set VDJ_NETWORK_PORT if not 80.",
    );
    process.exit(1);
  }
}

void main();
