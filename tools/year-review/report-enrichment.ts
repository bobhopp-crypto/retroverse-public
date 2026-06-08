/**
 * Report Year Review enrichment metrics + sample rows (Step 2).
 * Run: npx tsx tools/year-review/report-enrichment.ts [year]
 */
import { loadYearWorkspace } from "../../lib/ops/load-year-workspace";
import { inspectPing } from "../../lib/inspect/pg";

const year = Number(process.argv[2] ?? "1967");

function sampleRow(row: Awaited<ReturnType<typeof loadYearWorkspace>>["reviewRows"][number]) {
  return {
    peak: row.peak,
    artist: row.artist,
    title: row.title,
    vdjMatch: row.vdjMatch,
    playCount: row.playCount,
    classification: row.classification,
    autoPromoted: row.classificationAutoPromoted,
    historicalTags: row.historicalTags,
    retroverseTagsSource: row.retroverseTagsSource,
    vdjImportHint: row.historicalTagsFromVdj,
    sourcePath: row.sourcePath ? "…" + row.sourcePath.slice(-48) : null,
  };
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline:", ping.error ?? "unknown");
    process.exitCode = 1;
    return;
  }

  const data = await loadYearWorkspace(year);

  console.log(`\nYear Review enrichment — ${year}\n`);
  console.log("Metrics:");
  console.log(JSON.stringify(data.reviewMetrics, null, 2));

  console.log("\nBucket stats:");
  console.log(
    JSON.stringify(
      {
        billboardTotal: data.stats.billboardTotal,
        inBoth: data.stats.inBoth,
        chartOnly: data.stats.chartOnly,
        reviewRows: data.reviewRows.length,
      },
      null,
      2,
    ),
  );

  const autoPromoted = data.reviewRows.filter((r) => r.classificationAutoPromoted).slice(0, 5);
  const vdjImport = data.reviewRows
    .filter((r) => r.retroverseTagsSource === "vdj_import")
    .slice(0, 5);
  const needsReviewRows = data.reviewRows
    .filter((r) => r.classification === "Fill" && (r.playCount == null || r.playCount < 5))
    .slice(0, 5);
  const topPeaks = data.reviewRows.slice(0, 5);

  console.log("\nSample — top 5 peaks:");
  console.log(JSON.stringify(topPeaks.map(sampleRow), null, 2));

  console.log("\nSample — auto-promoted Cocktail (playCount ≥ 5):");
  console.log(JSON.stringify(autoPromoted.map(sampleRow), null, 2));

  console.log("\nSample — VDJ User2 import hints (not canonical until saved on RVTR):");
  console.log(JSON.stringify(vdjImport.map(sampleRow), null, 2));

  console.log("\nSample — Needs Review (Fill + playCount < 5):");
  console.log(JSON.stringify(needsReviewRows.map(sampleRow), null, 2));
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
