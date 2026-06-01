/**
 * Temporary skip-failed measurement run — main queue only, no retries.
 *
 * Usage:
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill-skip-failed.ts
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill-skip-failed.ts --limit 500
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill-skip-failed.ts --report-only
 */
import {
  SKIP_FAILED_RUN_LIMIT,
  runSkipFailedMeasurement,
} from "@/lib/covers/backfill/skip-failed-run";
import { skipFailedRunReportPath, skipFailedRunStatePath } from "@/lib/covers/backfill/paths";
import { loadBackfillState } from "@/lib/covers/backfill/state";
import { readFile, writeFile } from "node:fs/promises";
import { buildBackfillRunReport, writeBackfillRunReport } from "@/lib/covers/backfill/report";
import { countCoveredRvalAlbums, loadMissingCoverQueue } from "@/lib/covers/backfill/queue";

const args = process.argv.slice(2);
const reportOnly = args.includes("--report-only");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limitFlagIdx = args.indexOf("--limit");
const limit =
  limitArg != null
    ? Number.parseInt(limitArg.split("=")[1] ?? "", 10)
    : limitFlagIdx >= 0
      ? Number.parseInt(args[limitFlagIdx + 1] ?? "", 10)
      : SKIP_FAILED_RUN_LIMIT;

async function main() {
  if (reportOnly) {
    const state = await loadBackfillState();
    const report = buildBackfillRunReport({
      state,
      mainCursorBefore: state.mainCursor,
      mainCursorAfter: state.mainCursor,
      currentlyCovered: await countCoveredRvalAlbums(),
      coversRemaining: (await loadMissingCoverQueue()).length,
    });
    await writeBackfillRunReport({ ...report, mode: "safe" });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    console.error("Invalid --limit");
    process.exit(1);
  }

  const backfill = await loadBackfillState();
  console.log(`skip-failed run starting limit=${limit} mainCursor=${backfill.mainCursor}`);

  const { run, report } = await runSkipFailedMeasurement(limit);

  console.log("");
  console.log("=== SKIP-FAILED MEASUREMENT REPORT ===");
  console.log(`unique_albums_processed=${report.uniqueAlbumsProcessed}`);
  console.log(`successful_acquisitions=${report.uniqueSuccesses}`);
  console.log(`failed_acquisitions=${report.uniqueFailures}`);
  console.log(`success_rate=${report.successRate}%`);
  console.log(`main_cursor=${report.mainCursorBefore} → ${report.mainCursorAfter}`);
  console.log("");
  console.log("top_failure_reasons:");
  for (const r of report.topFailureReasons.slice(0, 10)) {
    console.log(`  ${r.count}\t${r.reason}`);
  }
  console.log("");
  console.log("top_failure_patterns:");
  for (const p of report.topFailurePatterns.slice(0, 10)) {
    console.log(`  ${p.count}\t${p.pattern}`);
    for (const ex of p.examples) console.log(`    · ${ex}`);
  }
  console.log("");
  console.log(`report=${skipFailedRunReportPath()}`);
  console.log(`run_state=${skipFailedRunStatePath()} finished=${run.finished}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
