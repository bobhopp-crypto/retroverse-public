/**
 * Match Cleanup Execution — repair feat corruption + apply simulation reassignments.
 * Usage: npm run ops:match-cleanup-execution
 * Dry run: DRY_RUN=1 npm run ops:match-cleanup-execution
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function collectMetrics(root: string) {
  const { runVideoMatchConfidenceAudit } = await import("../lib/ops/video-match-confidence-audit.ts");
  const { runGraphIntegrityAudit } = await import("../lib/ops/graph-integrity-audit.ts");
  const { loadChartUniverseIndex } = await import("../lib/ops/browser-plus/chart-universe.ts");
  const { loadMatchedVideoTracks } = await import("../lib/ops/canonical-coverage-audit.ts");
  const { loadUnmatchedVideoTracks } = await import(
    "../lib/ops/browser-plus/load-unmatched-video-tracks.ts"
  );
  const { loadAllVideoLibraryTracks } = await import("../lib/ops/load-video-library-tracks.ts");
  const { inspectQuery } = await import("../lib/inspect/pg.ts");

  const phase3Dir = join(root, "reports/match-agent-phase-3");
  const [confidence, graph, chartIndex, matchedTracks, unmatched, library] = await Promise.all([
    runVideoMatchConfidenceAudit({
      conflictCsvPath: join(phase3Dir, "conflict-reassignment.csv"),
      leastTrustworthyLimit: 500,
    }),
    runGraphIntegrityAudit({
      leastTrustworthyCsvPath: join(phase3Dir, "least-trustworthy-500.csv"),
    }),
    loadChartUniverseIndex(),
    loadMatchedVideoTracks(),
    loadUnmatchedVideoTracks(),
    loadAllVideoLibraryTracks(),
  ]);

  const rvtrs = [...new Set(matchedTracks.map((t) => t.rvtr.toUpperCase()))];
  const metaRows = await inspectQuery<{ rvtr: string; identity_source: string | null }>(
    `
    SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
           identity_source
    FROM canonical_track_display
    WHERE upper(trim(coalesce(retroverse_track_id, track_id))) = ANY($1::text[])
    `,
    [rvtrs],
  );
  const sourceByRvtr = new Map(metaRows.map((r) => [r.rvtr, r.identity_source ?? "missing"]));

  const identity = { hot100: 0, hot100_vdj: 0, vdj: 0, other: 0, missing: 0, total: matchedTracks.length };
  for (const track of matchedTracks) {
    const src = sourceByRvtr.get(track.rvtr.toUpperCase()) ?? "missing";
    if (src === "hot100") identity.hot100 += 1;
    else if (src === "hot100_vdj") identity.hot100_vdj += 1;
    else if (src === "vdj") identity.vdj += 1;
    else if (src === "missing") identity.missing += 1;
    else identity.other += 1;
  }

  const labelSet = new Set(matchedTracks.map((t) => t.rvtr.toUpperCase()));
  let labelOwned = 0;
  for (const rvtr of chartIndex.hot100Rvtrs) {
    if (labelSet.has(rvtr)) labelOwned += 1;
  }
  const hot100Universe = chartIndex.hot100Rvtrs.size;

  const unresolved = library.filter((t) => !t.rvtr).length;
  const reviewCount = confidence.buckets.medium;
  const canonicalAssigned = identity.hot100 + identity.hot100_vdj;

  return {
    scannedAt: new Date().toISOString(),
    confidence: {
      buckets: confidence.buckets,
      total: confidence.total,
    },
    unresolved,
    unmatchedBrowserPlus: unmatched.length,
    graphCorruptCount: graph.affectedRvtrCount,
    chartCoverage: {
      hot100Universe,
      labelOwned,
      labelOwnedPct: hot100Universe > 0 ? Math.round((labelOwned / hot100Universe) * 1000) / 10 : 0,
    },
    identity,
    canonicalAssigned,
    reviewCount,
  };
}

function formatReport(input: {
  before: Awaited<ReturnType<typeof collectMetrics>>;
  after: Awaited<ReturnType<typeof collectMetrics>>;
  repair: Awaited<ReturnType<typeof import("../lib/ops/repair-feat-corruption.ts").repairFeatCorruption>>;
  reassign: Awaited<
    ReturnType<typeof import("../lib/ops/apply-simulation-reassignments.ts").applySimulationReassignments>
  >;
  dryRun: boolean;
}): string {
  const b = input.before;
  const a = input.after;
  const vdjToCanonical =
    a.identity.hot100 +
    a.identity.hot100_vdj -
    (b.identity.hot100 + b.identity.hot100_vdj);

  return `# Match Cleanup Execution Report

**Executed:** ${a.scannedAt}  
**Mode:** ${input.dryRun ? "DRY RUN" : "LIVE"}

---

## Step 1 — Canonical title repair

| Metric | Value |
|--------|------:|
| Corrupt RVTRs scanned | ${input.repair.totalCorrupt} |
| Repair plans (graph title + key validated) | ${input.repair.planned.length} |
| Repaired | ${input.repair.repaired} |
| Skipped (no source / already clean) | ${input.repair.skipped.length} |
| Backup | \`${input.repair.backupPath}\` |

Remaining feat-corruption RVTRs after repair: **${a.graphCorruptCount}** (was ${b.graphCorruptCount})

---

## Step 2 — Simulation reassignments

| Metric | Value |
|--------|------:|
| CSV rows | ${input.reassign.totalCsvRows} |
| Eligible (exact/high, canonical, ≥95%) | ${input.reassign.eligible.length} |
| Labels changed | ${input.reassign.applied} |
| Already correct | ${input.reassign.unchanged} |
| Blocked / skipped | ${input.reassign.skipped} |
| Failed | ${input.reassign.failed.length} |
| VDJ backup | ${input.reassign.backupPath ? `\`${input.reassign.backupPath}\`` : "—"} |

---

## Before / After — Match confidence

| Bucket | Before | After | Δ |
|--------|-------:|------:|--:|
| Exact | ${b.confidence.buckets.exact} | ${a.confidence.buckets.exact} | ${a.confidence.buckets.exact - b.confidence.buckets.exact >= 0 ? "+" : ""}${a.confidence.buckets.exact - b.confidence.buckets.exact} |
| High | ${b.confidence.buckets.high} | ${a.confidence.buckets.high} | ${a.confidence.buckets.high - b.confidence.buckets.high >= 0 ? "+" : ""}${a.confidence.buckets.high - b.confidence.buckets.high} |
| Medium | ${b.confidence.buckets.medium} | ${a.confidence.buckets.medium} | ${a.confidence.buckets.medium - b.confidence.buckets.medium >= 0 ? "+" : ""}${a.confidence.buckets.medium - b.confidence.buckets.medium} |
| Low | ${b.confidence.buckets.low} | ${a.confidence.buckets.low} | ${a.confidence.buckets.low - b.confidence.buckets.low >= 0 ? "+" : ""}${a.confidence.buckets.low - b.confidence.buckets.low} |
| Suspicious | ${b.confidence.buckets.suspicious} | ${a.confidence.buckets.suspicious} | ${a.confidence.buckets.suspicious - b.confidence.buckets.suspicious >= 0 ? "+" : ""}${a.confidence.buckets.suspicious - b.confidence.buckets.suspicious} |

---

## Coverage & inventory

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Unresolved VIDEO (no RVTR) | ${b.unresolved} | ${a.unresolved} | ${a.unresolved - b.unresolved >= 0 ? "+" : ""}${a.unresolved - b.unresolved} |
| Browser Plus unmatched | ${b.unmatchedBrowserPlus} | ${a.unmatchedBrowserPlus} | ${a.unmatchedBrowserPlus - b.unmatchedBrowserPlus >= 0 ? "+" : ""}${a.unmatchedBrowserPlus - b.unmatchedBrowserPlus} |
| Chart/canonical assigned labels | ${b.canonicalAssigned} | ${a.canonicalAssigned} | ${vdjToCanonical >= 0 ? "+" : ""}${vdjToCanonical} |
| Hot 100 label-owned video | ${b.chartCoverage.labelOwned} | ${a.chartCoverage.labelOwned} | +${a.chartCoverage.labelOwned - b.chartCoverage.labelOwned} |
| Hot 100 coverage % | ${b.chartCoverage.labelOwnedPct}% | ${a.chartCoverage.labelOwnedPct}% | +${Math.round((a.chartCoverage.labelOwnedPct - b.chartCoverage.labelOwnedPct) * 10) / 10}pp |
| Review count (medium bucket) | ${b.reviewCount} | ${a.reviewCount} | ${a.reviewCount - b.reviewCount >= 0 ? "+" : ""}${a.reviewCount - b.reviewCount} |

---

## Identity distribution (assigned VIDEO labels)

| Source | Before | After |
|--------|-------:|------:|
| hot100 | ${b.identity.hot100} | ${a.identity.hot100} |
| hot100_vdj | ${b.identity.hot100_vdj} | ${a.identity.hot100_vdj} |
| vdj | ${b.identity.vdj} | ${a.identity.vdj} |

---

No package generation. Stop here.
`;
}

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-cleanup-execution");
  await mkdir(outDir, { recursive: true });
  const dryRun = process.env.DRY_RUN === "1";

  console.log("Collecting BEFORE metrics…");
  const before = await collectMetrics(root);
  await writeFile(join(outDir, "before-metrics.json"), JSON.stringify(before, null, 2), "utf8");

  console.log(dryRun ? "DRY RUN — Step 1 repair…" : "Step 1 — Repair feat corruption…");
  const { repairFeatCorruption } = await import("../lib/ops/repair-feat-corruption.ts");
  const repair = await repairFeatCorruption({ outDir, dryRun });
  console.log(
    JSON.stringify(
      {
        totalCorrupt: repair.totalCorrupt,
        planned: repair.planned.length,
        repaired: repair.repaired,
        skipped: repair.skipped.length,
      },
      null,
      2,
    ),
  );

  const csvPath = join(root, "reports/match-engine-simulation/reassignment-opportunities.csv");
  console.log(dryRun ? "DRY RUN — Step 2 reassignments…" : "Step 2 — Apply reassignments…");
  const { applySimulationReassignments } = await import("../lib/ops/apply-simulation-reassignments.ts");
  const reassign = await applySimulationReassignments({ csvPath, outDir, dryRun });
  console.log(
    JSON.stringify(
      {
        eligible: reassign.eligible.length,
        applied: reassign.applied,
        unchanged: reassign.unchanged,
        failed: reassign.failed.length,
        backupPath: reassign.backupPath,
      },
      null,
      2,
    ),
  );

  console.log("Step 3 — Re-run audits…");
  const after = await collectMetrics(root);
  await writeFile(join(outDir, "after-metrics.json"), JSON.stringify(after, null, 2), "utf8");

  const report = formatReport({ before, after, repair, reassign, dryRun });
  await writeFile(join(outDir, "EXECUTION-REPORT.md"), report, "utf8");
  await writeFile(
    join(outDir, "execution-summary.json"),
    JSON.stringify({ before, after, repair, reassign, dryRun }, null, 2),
    "utf8",
  );

  console.log(`\nWrote: ${join(outDir, "EXECUTION-REPORT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
