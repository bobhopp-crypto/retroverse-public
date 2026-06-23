#!/usr/bin/env npx tsx
/**
 * VIDEO linkage coverage audit — writes reports/intelligence/video-linkage-audit.md
 *
 * Usage:
 *   npm run intelligence:video-linkage
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadVideoBackfillCoverage } from "../../lib/ops/intelligence/backfill-coverage.ts";
import { vdjDatabasePath } from "../../lib/ops/intelligence/vdj-database.ts";

const OUT = join(process.cwd(), "reports/intelligence");

async function main() {
  await mkdir(OUT, { recursive: true });
  const { coverage, videos } = await loadVideoBackfillCoverage();

  const topLinkedNoCover = videos.filter((v) => !v.hasCover).slice(0, 15);
  const topReady = videos.filter((v) => v.retroverseReady).slice(0, 10);
  const topEligibleNoPackage = videos.filter((v) => v.hasCover && !v.hasPackage).slice(0, 15);

  const lines = [
    "# VIDEO Linkage Coverage Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: \`VIDEO/\` folder in VirtualDJ \`${vdjDatabasePath()}\``,
    "",
    "## Summary",
    "",
    "| Metric | Count | % of VIDEO |",
    "| --- | ---: | ---: |",
    `| VIDEO files in library | ${coverage.videosInLibrary.toLocaleString()} | 100% |`,
    `| VIDEO entries with RVTR | ${coverage.videosWithRvtr.toLocaleString()} | ${coverage.linkedPct}% |`,
    `| Unlinked VIDEO entries | ${coverage.videosUnlinked.toLocaleString()} | ${coverage.videosInLibrary ? Math.round((coverage.videosUnlinked / coverage.videosInLibrary) * 100) : 0}% |`,
    `| Unique RVTRs (from VIDEO) | ${coverage.uniqueRvtrs.toLocaleString()} | — |`,
    `| RVTRs with cover | ${coverage.videosWithCover.toLocaleString()} | ${coverage.coverPct}% of RVTRs |`,
    `| Intelligence-eligible (RVTR + cover) | ${coverage.intelligenceEligible.toLocaleString()} | — |`,
    `| Retroverse Ready | ${coverage.retroverseReady.toLocaleString()} | ${coverage.retroverseReadyPct}% of RVTRs |`,
    "",
    "## Bottleneck",
    "",
    "Linkage coverage is the primary scale blocker — not AI throughput.",
    "",
    `- **Missing links:** ${coverage.missingLinks.toLocaleString()} VIDEO files without RVTR`,
    `- **Missing covers:** ${coverage.missingCovers.toLocaleString()} linked RVTRs without cover art`,
    `- **Missing packages:** ${coverage.missingPackages.toLocaleString()} RVTRs with cover but no package`,
    "",
    "## Retroverse Ready Funnel",
    "",
    "```text",
    "VIDEO",
    "  ↓",
    "RVTR",
    "  ↓",
    "Cover",
    "  ↓",
    "Package",
    "  ↓",
    "Artifacts",
    "  ↓",
    "Retroverse Ready",
    "```",
    "",
    `| Stage | Count |`,
    `| --- | ---: |`,
    `| VIDEO | ${coverage.videosInLibrary.toLocaleString()} |`,
    `| RVTR linked | ${coverage.videosWithRvtr.toLocaleString()} (${coverage.linkedPct}%) |`,
    `| Cover | ${coverage.videosWithCover.toLocaleString()} (${coverage.coverPct}% of RVTRs) |`,
    `| Package | ${coverage.videosWithPackage.toLocaleString()} (${coverage.packagePct}% of RVTRs) |`,
    `| Artifacts | ${coverage.videosWithArtifacts.toLocaleString()} (${coverage.artifactPct}% of RVTRs) |`,
    `| **Retroverse Ready** | **${coverage.retroverseReady.toLocaleString()}** (${coverage.retroverseReadyPct}%) |`,
    "",
    "## Top Linked — Missing Cover (by play count)",
    "",
    "| Plays | RVTR | Title | Artist |",
    "| ---: | --- | --- | --- |",
  ];

  for (const v of topLinkedNoCover) {
    lines.push(`| ${v.playCount.toLocaleString()} | ${v.rvtr} | ${v.title} | ${v.artist} |`);
  }

  lines.push("", "## Top Eligible — Missing Package (by play count)", "", "| Plays | RVTR | Title | Artist |", "| ---: | --- | --- | --- |");

  for (const v of topEligibleNoPackage) {
    lines.push(`| ${v.playCount.toLocaleString()} | ${v.rvtr} | ${v.title} | ${v.artist} |`);
  }

  if (topReady.length > 0) {
    lines.push("", "## Retroverse Ready (top plays)", "", "| Plays | RVTR | Title |", "| ---: | --- | --- |");
    for (const v of topReady) {
      lines.push(`| ${v.playCount.toLocaleString()} | ${v.rvtr} | ${v.title} |`);
    }
  }

  lines.push("", "## Recommendation", "", "1. Expand `media_track_links` for high-play VIDEO files", "2. Assign covers via Cover Library for linked RVTRs", "3. Run package queue (`npm run intelligence:next10`) only after cover gate passes", "");

  const reportPath = join(OUT, "video-linkage-audit.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(
    join(OUT, "video-linkage-audit.json"),
    `${JSON.stringify({ coverage, topLinkedNoCover, topEligibleNoPackage, topReady }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nVIDEO Linkage Audit`);
  console.log(`  VIDEO files:     ${coverage.videosInLibrary.toLocaleString()}`);
  console.log(`  Linked:          ${coverage.videosWithRvtr.toLocaleString()} (${coverage.linkedPct}%)`);
  console.log(`  Unlinked:        ${coverage.videosUnlinked.toLocaleString()}`);
  console.log(`  Intel-eligible:  ${coverage.intelligenceEligible.toLocaleString()}`);
  console.log(`  Retroverse Ready:${coverage.retroverseReady.toLocaleString()} (${coverage.retroverseReadyPct}%)`);
  console.log(`\nReport: ${reportPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
