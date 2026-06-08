import { inspectPing } from "../../lib/inspect/pg";
import { loadReviewUniverse } from "../../lib/ops/load-review-universe";
import { loadYearWorkspaceState } from "../../lib/ops/year-workspace/state";

const FIXTURE_PATH = "reports/review-universe/1967-regression-fixtures.json";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("PG offline:", ping.error);
    process.exit(1);
  }

  const year = 1967;
  const state = await loadYearWorkspaceState(year);
  const payload = await loadReviewUniverse(year);
  const rows = payload.workspace.reviewRows;

  const fs = await import("fs");
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as {
    matched: Array<{ workspaceKey: string; graphTrackId?: number | null }>;
    shouldMatch: Array<{ workspaceKey: string }>;
  };

  let matchedOk = 0;
  for (const f of fixtures.matched) {
    const row = rows.find(
      (r) =>
        r.workspaceKey === f.workspaceKey ||
        (f.graphTrackId != null && r.graphTrackId === f.graphTrackId),
    );
    if (row?.vdjMatch === "matched" && row.graphTrackId != null) matchedOk += 1;
  }

  const keySet = new Set(rows.map((r) => r.workspaceKey));
  if (keySet.size !== rows.length) {
    console.error("FAIL duplicate workspaceKeys", rows.length - keySet.size);
    process.exit(1);
  }

  const u = payload.universes;
  const checks = [
    {
      id: "video-count-1967",
      ok: u.video === 130,
      detail: `video=${u.video}`,
    },
    {
      id: "chart-universe-1967",
      ok: u.chart === 827,
      detail: `chart=${u.chart}`,
    },
    {
      id: "chart-linked",
      ok: u.linked === 52,
      detail: `linked=${u.linked}`,
    },
    {
      id: "regression-matched-floor",
      ok: u.regressionMatched === 21,
      detail: `fixtures=${u.regressionMatched}`,
    },
    {
      id: "video-only",
      ok: u.videoOnly === 78,
      detail: `only=${u.videoOnly}`,
    },
    {
      id: "matched-fixtures",
      ok: matchedOk === fixtures.matched.length,
      detail: `${matchedOk}/${fixtures.matched.length}`,
    },
    {
      id: "review-mode",
      ok: payload.reviewMode === "video_universe",
      detail: payload.reviewMode,
    },
  ];

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "OK" : "FAIL";
    console.log(`${mark} ${c.id}: ${c.detail}`);
    if (!c.ok) failed += 1;
  }

  process.exit(failed > 0 ? 1 : 0);
}

void main();
