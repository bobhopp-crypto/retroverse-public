import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { inspectPing } from "../../lib/inspect/pg";
import { loadReviewUniverse } from "../../lib/ops/load-review-universe";

const OUT_DIR = "reports/review-universe";
const FIXTURES = join(OUT_DIR, "1967-regression-fixtures.json");

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("PG offline:", ping.error);
    process.exit(1);
  }

  const payload = await loadReviewUniverse(1967);
  const u = payload.universes;
  const rows = payload.workspace.reviewRows;

  const fixtures = JSON.parse(readFileSync(FIXTURES, "utf8")) as {
    matched: Array<{ workspaceKey: string }>;
    shouldMatch: Array<{ workspaceKey: string }>;
  };

  let matchedFixtureOk = 0;
  for (const f of fixtures.matched) {
    const row = rows.find((r) => r.workspaceKey === f.workspaceKey);
    if (row?.graphTrackId != null && row.vdjMatch === "matched") matchedFixtureOk += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    year: 1967,
    universes: u,
    table: {
      rowCount: rows.length,
      playCountKnown: payload.playCountRows,
      needsReview: payload.needsReviewRows,
    },
    regression: {
      matchedFixture: fixtures.matched.length,
      matchedFixtureOk,
      shouldMatchFixture: fixtures.shouldMatch.length,
      regressionMatchedFloor: 21,
      regressionMatchedPass: u.regressionMatched >= 21,
    },
    phase: "1",
    uiUrl: "http://localhost:3000/ops/year/1967",
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "phase1-approval-counts.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("Phase 1 — 1967 Review Universe");
  console.log("─────────────────────────────");
  console.log(`A Video Universe:    ${u.video}`);
  console.log(`B Chart Universe:    ${u.chart}`);
  console.log(`C Linked Universe:   ${u.linked} (regression matched ${u.regressionMatched})`);
  console.log(`   Video only:       ${u.videoOnly}`);
  console.log(`Regression 21/21:    ${matchedFixtureOk === 21 ? "PASS" : "FAIL"} (${matchedFixtureOk})`);
  console.log(`Should-match fixture: ${fixtures.shouldMatch.length} (no auto-match yet)`);
  console.log(`\nWrote ${outPath}`);
  console.log(`Open ${report.uiUrl} for screenshot (ops PIN required).`);

  const fail =
    u.video !== 130 ||
    u.linked !== 52 ||
    u.videoOnly !== 78 ||
    matchedFixtureOk < 21 ||
    u.regressionMatched < 21;

  process.exit(fail ? 1 : 0);
}

void main();
