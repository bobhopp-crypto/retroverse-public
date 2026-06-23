#!/usr/bin/env npx tsx
/**
 * Automated Cover Recovery — Top 100 missing covers.
 *
 * Usage:
 *   npm run intelligence:cover-recovery
 *   npm run intelligence:cover-recovery -- --skip-external
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { runCoverRecoveryQueue } from "../../lib/ops/intelligence/cover-recovery-store.ts";
import { loadTopPlayedBackfill } from "../../lib/ops/intelligence/top-played-backfill.ts";

const OUT = join(process.cwd(), "reports/intelligence");

async function main() {
  const skipExternal = process.argv.includes("--skip-external");
  await mkdir(OUT, { recursive: true });

  console.log("\nCover Recovery Queue — Top 100 missing covers");
  console.log(`  external lookups: ${skipExternal ? "OFF" : "ON"}\n`);

  const result = await runCoverRecoveryQueue({ cohort: 100, skipExternal });
  const topPlayed = await loadTopPlayedBackfill();
  const { queue, before, after } = result;
  const { summary } = queue;

  const lines = [
    "# Cover Recovery Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Outcome | Count |`,
    `| --- | ---: |`,
    `| **Recovered** (auto) | ${summary.recovered} |`,
    `| Review Needed | ${summary.reviewNeeded} |`,
    `| Failed | ${summary.failed} |`,
    `| Total processed | ${summary.total} |`,
    "",
    "## Top 100 Readiness (before → after)",
    "",
    `| Metric | Before | After |`,
    `| --- | ---: | ---: |`,
    `| Cover % | ${before.coverPct}% | ${after.coverPct}% |`,
    `| Missing covers | ${before.missingCovers} | ${after.missingCovers} |`,
    `| Package % | — | ${topPlayed.top100.packagePct}% |`,
    `| Artifacts % | — | ${topPlayed.top100.artifactPct}% |`,
  ];

  lines.push("", "## Recovered", "", "| Plays | Song | Source | Conf | Resolution |", "| ---: | --- | --- | ---: | --- |");
  for (const e of queue.entries.filter((x) => x.outcome === "recovered")) {
    lines.push(`| ${e.playCount} | ${e.title} | ${e.coverSource ?? "—"} | ${e.confidence}% | ${e.resolution ?? "—"} |`);
  }

  lines.push("", "## Review Needed", "", "| Plays | Song | Source | Conf | Validation |", "| ---: | --- | --- | ---: | --- |");
  for (const e of queue.entries.filter((x) => x.outcome === "review_needed")) {
    lines.push(`| ${e.playCount} | ${e.title} | ${e.coverSource ?? "—"} | ${e.confidence}% | ${e.validationStatus} |`);
  }

  lines.push("", "## Failed", "", "| Plays | Song | RVTR |", "| ---: | --- | --- |");
  for (const e of queue.entries.filter((x) => x.outcome === "failed")) {
    lines.push(`| ${e.playCount} | ${e.title} | ${e.rvtr || "—"} |`);
  }

  const reportPath = join(OUT, "cover-recovery-report.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(join(OUT, "cover-recovery-report.json"), `${JSON.stringify({ queue, before, after, topPlayed: topPlayed.top100 }, null, 2)}\n`, "utf8");

  console.log(`Recovered:      ${summary.recovered}`);
  console.log(`Review needed:  ${summary.reviewNeeded}`);
  console.log(`Failed:         ${summary.failed}`);
  console.log(`\nTop 100 cover:  ${before.coverPct}% → ${after.coverPct}%`);
  console.log(`Missing covers: ${before.missingCovers} → ${after.missingCovers}`);
  console.log(`\nReport: ${reportPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
