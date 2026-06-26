/**
 * Match Agent Phase 2 — auto-assign high-confidence VIDEO-folder RVTR matches.
 *
 * Usage:
 *   npm run ops:match-agent -- --dry-run
 *   npm run ops:match-agent -- --dry-run --limit 100
 *   npm run ops:match-agent
 */
import { join } from "node:path";

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limitFlagIdx = argv.indexOf("--limit");
  let limit: number | undefined;
  if (limitArg) {
    limit = Number(limitArg.split("=")[1]);
  } else if (limitFlagIdx >= 0) {
    limit = Number(argv[limitFlagIdx + 1]);
  }
  return { dryRun, limit: Number.isFinite(limit) && limit! > 0 ? limit : undefined };
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));

  const { inspectPing } = await import("../lib/inspect/pg");
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error(`Postgres unavailable: ${ping.error ?? "unknown"}`);
    process.exit(1);
  }

  const { runMatchAgentPhase2, writeMatchAgentReport } = await import(
    "../lib/ops/browser-plus/match-agent"
  );

  const report = await runMatchAgentPhase2({
    dryRun,
    limit,
    onProgress: (message) => console.log(message),
  });

  const root = join(import.meta.dirname, "..");
  const stamp = report.runAt.replace(/[:.]/g, "-");
  const outDir = join(root, "reports", "match-agent-phase-2", stamp);
  await writeMatchAgentReport(report, outDir);

  const { totals } = report;
  console.log("");
  console.log("Match Agent Phase 2 complete");
  console.log(`  Mode:          ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Unmatched:     ${totals.unmatched}`);
  console.log(`  Auto-Matched:  ${totals.autoMatched}`);
  console.log(`  Needs Review:  ${totals.needsReview}`);
  console.log(`  No Candidate:  ${totals.noCandidate}`);
  if (!dryRun) {
    console.log(`  Assigned:      ${totals.assigned}`);
    console.log(`  Assign failed: ${totals.assignFailed}`);
    console.log(`  Assign skip:   ${totals.assignSkipped}`);
    console.log(`  Backup:        ${report.backupPath ?? "—"}`);
  }
  console.log(`\nReport: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
