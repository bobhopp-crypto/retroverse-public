#!/usr/bin/env npx tsx
/**
 * Top 100 completion report — cover / package / artifact progress.
 *
 * Usage:
 *   npm run intelligence:top100-report
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadTopPlayedBackfill } from "../../lib/ops/intelligence/top-played-backfill.ts";

const OUT = join(process.cwd(), "reports/intelligence");

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${Math.round(ms / 1000)}s`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const data = await loadTopPlayedBackfill();

  const lines = [
    "# Top Played Backfill Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Objective",
    "",
    "Bring **Top 100 most-played VIDEO** tracks to 100% cover, package, and artifact coverage before large-scale library backfill.",
    "",
    "## Current Completion",
    "",
    "| Cohort | Cover | Package | Artifacts | Retroverse Ready |",
    "| --- | ---: | ---: | ---: | ---: |",
    `| Top 25 | ${data.top25.coverPct}% (${data.top25.cover}/${data.top25.size}) | ${data.top25.packagePct}% | ${data.top25.artifactPct}% | ${data.top25.readyPct}% |`,
    `| Top 50 | ${data.top50.coverPct}% (${data.top50.cover}/${data.top50.size}) | ${data.top50.packagePct}% | ${data.top50.artifactPct}% | ${data.top50.readyPct}% |`,
    `| Top 100 | ${data.top100.coverPct}% (${data.top100.cover}/${data.top100.size}) | ${data.top100.packagePct}% | ${data.top100.artifactPct}% | ${data.top100.readyPct}% |`,
    "",
    "## Work Remaining (Top 100)",
    "",
    `| Task | Count |`,
    `| --- | ---: |`,
    `| Missing covers | ${data.workRemaining.covers} |`,
    `| Missing packages (has cover) | ${data.workRemaining.packages} |`,
    `| Missing artifacts (has package) | ${data.workRemaining.artifacts} |`,
    `| Pipeline runs needed | ${data.workRemaining.totalPipelineRuns} |`,
    "",
    "## Projected Runtime (Top 100)",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Avg pipeline runtime | ${fmtMs(data.avgRuntimeMs)} |`,
    `| Est. total to complete Top 100 | ~${data.projectedTop100Minutes} min |`,
    "",
    "## Cover Completion Queue (Top 100, missing cover)",
    "",
    "| Plays | Title | Artist | RVTR |",
    "| ---: | --- | --- | --- |",
  ];

  for (const t of data.coverCompletionQueue) {
    lines.push(`| ${t.playCount} | ${t.title} | ${t.artist} | ${t.rvtr ?? "—"} |`);
  }

  lines.push("", "## Top 25 Detail", "", "| Plays | Song | Cover | Package | Artifacts | Conf | Runtime |", "| ---: | --- | --- | --- | --- | ---: | ---: |");

  for (const t of data.tracks.slice(0, 25)) {
    lines.push(
      `| ${t.playCount} | ${t.title} | ${t.hasCover ? "✓" : "✗"} | ${t.hasPackage ? "✓" : "✗"} | ${t.artifactsReady ? "✓" : "✗"} | ${t.confidence}% | ${fmtMs(t.runtimeMs)} |`,
    );
  }

  lines.push("", "## Commands", "", "```bash", "npm run intelligence:top100-report", "npm run intelligence:top25", "npm run intelligence:top100", "```", "");

  const reportPath = join(OUT, "top-played-backfill-report.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(join(OUT, "top-played-backfill-report.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log("\nTop Played Backfill Report\n");
  console.log(`  Top 100 cover:     ${data.top100.coverPct}%`);
  console.log(`  Top 100 package:   ${data.top100.packagePct}%`);
  console.log(`  Top 100 artifacts: ${data.top100.artifactPct}%`);
  console.log(`  Work remaining:      ${data.workRemaining.covers} covers · ${data.workRemaining.packages} packages · ${data.workRemaining.artifacts} artifacts`);
  console.log(`  Est. runtime:      ~${data.projectedTop100Minutes} min\n`);
  console.log(`Report: ${reportPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
