/**
 * Safe cover backfill — main queue progression, failures deferred to retry queue.
 *
 * Usage:
 *   RETROVERSE_PG_SSL=0 npm run cover:backfill:safe -- --limit 50
 *   RETROVERSE_PG_SSL=0 npm run cover:backfill:safe -- --limit 2000
 *   RETROVERSE_PG_SSL=0 npm run cover:backfill:safe -- --retry-failures
 */
import { runCoverBackfillSafeSession } from "@/lib/covers/backfill/safe-run";
import { backfillRunReportPath } from "@/lib/covers/backfill/paths";

function parseArgs(argv: string[]) {
  const retryFailures = argv.includes("--retry-failures");
  const once = argv.includes("--once");

  let limit: number | null = null;
  const limitEq = argv.find((a) => a.startsWith("--limit="));
  const limitIdx = argv.indexOf("--limit");
  if (limitEq) limit = Number.parseInt(limitEq.split("=")[1] ?? "", 10);
  else if (limitIdx >= 0) limit = Number.parseInt(argv[limitIdx + 1] ?? "", 10);

  return { retryFailures, once, limit };
}

async function main() {
  const { retryFailures, once, limit } = parseArgs(process.argv.slice(2));

  if (limit != null && (!Number.isFinite(limit) || limit <= 0)) {
    console.error("Invalid --limit");
    process.exit(1);
  }

  console.log(
    `safe backfill start limit=${limit ?? "none"} retryFailures=${retryFailures} once=${once}`,
  );

  const result = await runCoverBackfillSafeSession({
    limit: once ? (limit ?? 100) : limit,
    retryFailures,
    writeReport: true,
  });

  console.log("");
  console.log("=== SAFE BACKFILL SESSION ===");
  console.log(`session_processed=${result.sessionProcessed}`);
  console.log(`session_success=${result.sessionSuccess}`);
  console.log(`session_failure=${result.sessionFailure}`);
  console.log(`main_cursor=${result.mainCursorBefore} → ${result.mainCursorAfter}`);
  console.log(`retry_queue=${result.state.retryQueue.length}`);

  if (result.report) {
    console.log(`unique_success_rate=${result.report.successRate}%`);
    console.log(`projected_total_covered=${result.report.projectedTotalCovered}`);
    console.log("top_failure_reasons:");
    for (const r of result.report.topFailureReasons.slice(0, 8)) {
      console.log(`  ${r.count}\t${r.reason}`);
    }
  }

  console.log(`report=${backfillRunReportPath()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
