#!/usr/bin/env node
/**
 * Sprint 3.24 — run one RVTR through the full production pipeline.
 *
 * Usage:
 *   npm run research:studio:verify-one -- RVTR001341
 */
require("../finance/preload-server-only.cjs");

import { loadProductionCandidateRows } from "../../lib/ops/studio/production/load-candidate-rows.ts";
import { runProductionSong } from "../../lib/ops/studio/production/run-song.ts";

async function main() {
  const rvtr = (process.argv[2] ?? "").trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(rvtr)) {
    console.error("Usage: npm run research:studio:verify-one -- RVTR001341");
    process.exit(1);
  }

  const rows = await loadProductionCandidateRows();
  const row = rows.find((r) => r.rvtr === rvtr);
  if (!row) {
    console.error(`RVTR not found in production candidates: ${rvtr}`);
    process.exit(1);
  }

  console.log(`Running full pipeline: ${row.rvtr} — ${row.artist} — ${row.title}`);
  const result = await runProductionSong({
    item: row,
    skipCollector: true,
    refreshEditor: true,
    refreshDirector: true,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === "published" ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
