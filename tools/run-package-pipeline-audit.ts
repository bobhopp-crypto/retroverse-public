/**
 * Deep package pipeline audit — failure categories for owned VIDEO+RVTR tracks.
 *
 * Usage: npm run ops:package-pipeline-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectPing } from "../lib/inspect/pg";

function mdTable(rows: Array<{ label: string; count: number; pct: number }>): string {
  const lines = ["| Category | Count | % |", "|----------|------:|--:|"];
  for (const row of rows) {
    lines.push(`| ${row.label} | ${row.count.toLocaleString()} | ${row.pct}% |`);
  }
  return lines.join("\n");
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error(`Postgres unavailable: ${ping.error ?? "unknown"}`);
    process.exit(1);
  }

  const { auditPackagePipeline } = await import("../lib/ops/package-pipeline-audit");
  const audit = await auditPackagePipeline();
  const total = audit.ownedVideoCount;
  const target25 = Math.ceil(total * 0.25);

  function pct(n: number, d: number) {
    return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
  }

  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports", "package-priority-audit");
  await mkdir(outDir, { recursive: true });

  const fastestPath = `# Fastest path: 2% → 25% fully ready

**Current fully ready:** ${audit.fullyReady.toLocaleString()} (${audit.fullyReadyPct}%)
**Target (25%):** ${target25.toLocaleString()} tracks
**Gap:** ${(target25 - audit.fullyReady).toLocaleString()} tracks

## Why package readiness is only 4%

Intelligence package (cards_ready/published/story cards): **${audit.withIntelligencePackage.toLocaleString()}** / ${total.toLocaleString()} (${pct(audit.withIntelligencePackage, total)}%).

**Root cause:** ${audit.noPackageReasons[0]?.label ?? "—"} accounts for **${audit.noPackageReasons[0]?.pct ?? 0}%** of owned tracks. Pipeline requires **cover before package generation** — ${audit.prerequisiteCounts.hasCover.toLocaleString()} have covers, ${(total - audit.prerequisiteCounts.hasCover).toLocaleString()} do not.

## Tier 1 — Zero new packages (artifact completion only)

Tracks with package + cover + chart + playback but **artifacts incomplete**: **${audit.artifactOnlyGap.toLocaleString()}**

If artifacts completed on existing packages: **${audit.projectedFullyReadyIfArtifacts.toLocaleString()}** fully ready (${pct(audit.projectedFullyReadyIfArtifacts, total)}%)

## Tier 2 — Package generation on ready cohort

Tracks with **cover + playback**, no package file, not failed: **${audit.packageGenerationReady.toLocaleString()}**

These can enter batch pipeline immediately after Tier 1.

## Tier 3 — Cover backfill (unblocks largest bucket)

Missing cover (primary blocker): **${audit.primaryBlockers.find((b) => b.key === "missing_cover")?.count.toLocaleString() ?? "—"}** tracks

Cover backfill unlocks package generation for ~${(audit.primaryBlockers.find((b) => b.key === "missing_cover")?.count ?? 0) - (audit.packageGenerationReady > 0 ? 0 : 0)} additional tracks beyond Tier 2.

## Tier 4 — Playback link reconciliation

Missing playback link (VDJ file exists but no \`media_track_links\` VIDEO row): **${audit.primaryBlockers.find((b) => b.key === "missing_playback_link")?.count.toLocaleString() ?? "—"}**

Many are label-RVTR matched files without graph link — reconcile \`media_track_links\` from owned VIDEO paths.

## Recommended sequence (no content generation in this audit)

1. **Complete artifacts** on ${audit.artifactOnlyGap.toLocaleString()} existing packages → ~${pct(audit.projectedFullyReadyIfArtifacts, total)}% ready
2. **Batch-generate packages** for top-played Tier-2 cohort (${Math.min(audit.packageGenerationReady, target25 - audit.projectedFullyReadyIfArtifacts).toLocaleString()}+ tracks by play count)
3. **Cover backfill** on highest-play missing-cover owned VIDEO tracks
4. **Link reconciliation** for playback gaps on owned files

**Estimated reach to 25%:** Tier 1 (${audit.artifactOnlyGap}) + Tier 2 top ${Math.max(0, target25 - audit.fullyReady - audit.artifactOnlyGap).toLocaleString()} by play count from packageGenerationReady cohort.
`;

  const report = `# Package Pipeline Deep Audit

**Scanned:** ${audit.scannedAt}
**Cohort:** ${total.toLocaleString()} owned VIDEO + RVTR tracks

---

## Headline metrics

| Metric | Count | % |
|--------|------:|--:|
| Fully ready | ${audit.fullyReady.toLocaleString()} | ${audit.fullyReadyPct}% |
| Intelligence package | ${audit.withIntelligencePackage.toLocaleString()} | ${pct(audit.withIntelligencePackage, total)}% |
| Package file (any status) | ${audit.withPackageFile.toLocaleString()} | ${pct(audit.withPackageFile, total)}% |
| Has cover | ${audit.prerequisiteCounts.hasCover.toLocaleString()} | ${pct(audit.prerequisiteCounts.hasCover, total)}% |
| Has Hot 100 chart | ${audit.prerequisiteCounts.hasChartHistory.toLocaleString()} | ${pct(audit.prerequisiteCounts.hasChartHistory, total)}% |
| Has artist data | ${audit.prerequisiteCounts.hasArtistData.toLocaleString()} | ${pct(audit.prerequisiteCounts.hasArtistData, total)}% |
| Has playback link | ${audit.prerequisiteCounts.hasPlaybackLink.toLocaleString()} | ${pct(audit.prerequisiteCounts.hasPlaybackLink, total)}% |
| All prerequisites | ${audit.prerequisiteCounts.hasAllPrerequisites.toLocaleString()} | ${pct(audit.prerequisiteCounts.hasAllPrerequisites, total)}% |

---

## Primary blocker (one per track)

${mdTable(audit.primaryBlockers)}

---

## No intelligence package — why (${(total - audit.withIntelligencePackage).toLocaleString()} tracks)

${mdTable(audit.noPackageReasons)}

---

## Has package but not fully ready (${(audit.withIntelligencePackage - audit.fullyReady).toLocaleString()} tracks)

${mdTable(audit.packageIncompleteReasons)}

---

## Package file status distribution

| Status | Count |
|--------|------:|
${Object.entries(audit.packageStatusCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([status, count]) => `| ${status} | ${count.toLocaleString()} |`)
  .join("\n")}

---

${fastestPath}
`;

  const slimRows = audit.rows.map((row) => ({
    rvtr: row.rvtr,
    artist: row.artist,
    title: row.title,
    playCount: row.playCount,
    primaryBlocker: row.primaryBlocker,
    hasCover: row.hasCover,
    hasChartHistory: row.hasChartHistory,
    hasPlaybackLink: row.hasPlaybackLink,
    hasIntelligencePackage: row.hasIntelligencePackage,
    packageStatus: row.packageStatus,
    artifactsReady: row.artifactsReady,
    artifactGaps: row.artifactGaps,
    batchStatus: row.batchStatus,
    fullyReady: row.fullyReady,
  }));

  await Promise.all([
    writeFile(join(outDir, "PIPELINE-AUDIT.md"), report, "utf8"),
    writeFile(join(outDir, "pipeline-audit.json"), JSON.stringify({ ...audit, rows: slimRows }, null, 2), "utf8"),
  ]);

  console.log("Package Pipeline Deep Audit");
  console.log(`  Owned VIDEO+RVTR:     ${total.toLocaleString()}`);
  console.log(`  Fully ready:          ${audit.fullyReady.toLocaleString()} (${audit.fullyReadyPct}%)`);
  console.log(`  Intelligence package: ${audit.withIntelligencePackage.toLocaleString()} (${pct(audit.withIntelligencePackage, total)}%)`);
  console.log("");
  console.log("Primary blockers:");
  for (const b of audit.primaryBlockers.slice(0, 6)) {
    console.log(`  ${b.label}: ${b.count.toLocaleString()} (${b.pct}%)`);
  }
  console.log("");
  console.log(`  Artifact-only gap:    ${audit.artifactOnlyGap.toLocaleString()}`);
  console.log(`  Package-gen ready:    ${audit.packageGenerationReady.toLocaleString()}`);
  console.log(`  Target 25%:           ${target25.toLocaleString()} tracks`);
  console.log(`\nWrote: ${join(outDir, "PIPELINE-AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
