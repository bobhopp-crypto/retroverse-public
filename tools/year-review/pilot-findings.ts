/**
 * Review Universe pilot findings — Top 10 × 1967 / 1978 / 1992.
 * Run: npx tsx tools/year-review/pilot-findings.ts
 */
import { inspectPing } from "../../lib/inspect/pg";
import { loadYearWorkspace } from "../../lib/ops/load-year-workspace";
import { loadReviewDiscovery } from "../../lib/ops/year-workspace/review-discovery";
import {
  REVIEW_PILOT_ACTIVE_YEARS,
  REVIEW_PILOT_TOP_N,
} from "../../lib/ops/year-workspace/review-pilot";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline — cannot run pilot findings");
    process.exitCode = 1;
    return;
  }

  const report: Record<string, unknown> = {
    pilot: {
      years: REVIEW_PILOT_ACTIVE_YEARS,
      topN: REVIEW_PILOT_TOP_N,
    },
    years: {} as Record<number, unknown>,
    checks: [] as { id: string; ok: boolean; detail: string }[],
  };

  for (const year of REVIEW_PILOT_ACTIVE_YEARS) {
    const data = await loadYearWorkspace(year);
    const rows = data.reviewRows;
    const peaks = rows.map((r) => r.peak).filter((p): p is number => p != null);
    const maxPeak = peaks.length ? Math.max(...peaks) : null;

    const vdj = {
      matched: rows.filter((r) => r.vdjMatch === "matched").length,
      missing: rows.filter((r) => r.vdjMatch === "missing").length,
      review: rows.filter((r) => r.vdjMatch === "review").length,
    };
    const tags = {
      canonical: rows.filter((r) => r.retroverseTagsSource === "canonical").length,
      vdj_import: rows.filter((r) => r.retroverseTagsSource === "vdj_import").length,
      legacy_review: rows.filter((r) => r.retroverseTagsSource === "legacy_review").length,
      none: rows.filter((r) => r.retroverseTagsSource === "none").length,
    };
    const classes = {
      Fill: rows.filter((r) => r.classification === "Fill").length,
      Cocktail: rows.filter((r) => r.classification === "Cocktail").length,
      Dance: rows.filter((r) => r.classification === "Dance").length,
      Slow: rows.filter((r) => r.classification === "Slow").length,
    };

    let discoverySample: unknown = null;
    const sample = rows[0];
    if (sample) {
      const disc = await loadReviewDiscovery({
        year,
        artist: sample.artist,
        title: sample.title,
        rvtr: sample.rvtr,
        graphTrackId: sample.graphTrackId,
      });
      discoverySample = {
        focus: `${sample.artist} — ${sample.title}`,
        sameArtist: disc.sameArtistActiveYears.length,
        sameSongOtherYears: disc.sameSongOtherYears.length,
        relatedAppearances: disc.relatedAppearances.length,
        retroverseCatalog: disc.retroverseCatalog.length,
        vdjCatalog: disc.vdjCatalog.length,
      };
    }

    (report.years as Record<number, unknown>)[year] = {
      pilotMode: data.pilotMode,
      rowCount: rows.length,
      maxPeak,
      vdj,
      tags,
      classes,
      discoverySample,
      top3: rows.slice(0, 3).map((r) => ({
        peak: r.peak,
        artist: r.artist,
        title: r.title,
        vdjMatch: r.vdjMatch,
        class: r.classification,
        tagSource: r.retroverseTagsSource,
        tagCount: r.historicalTags.length,
      })),
    };

    const checks = report.checks as { id: string; ok: boolean; detail: string }[];
    checks.push({
      id: `${year}-top10-slice`,
      ok: rows.length > 0 && (maxPeak == null || maxPeak <= REVIEW_PILOT_TOP_N),
      detail: `${rows.length} songs with peak ≤ ${REVIEW_PILOT_TOP_N} (max peak ${maxPeak ?? "?"})`,
    });
    checks.push({
      id: `${year}-vdj-signal`,
      ok: vdj.matched + vdj.review > 0 || rows.length === 0,
      detail: `matched=${vdj.matched} review=${vdj.review} missing=${vdj.missing}`,
    });
    checks.push({
      id: `${year}-discovery`,
      ok: discoverySample != null,
      detail: discoverySample ? JSON.stringify(discoverySample) : "no sample row",
    });
  }

  const allOk = (report.checks as { ok: boolean }[]).every((c) => c.ok);
  console.log("\n=== Review Universe Pilot Findings ===\n");
  console.log(JSON.stringify(report, null, 2));
  console.log(allOk ? "\nAll pilot checks passed.\n" : "\nSome checks need manual review.\n");
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
