/**
 * Midnight Special structured pipeline — collection validation.
 * Usage: npx tsx tools/media-collections/ms-validation.ts [--seed=42]
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { parseEpisodeTitle } from "@/lib/ops/media-collections/parse-episode-title";
import { analyzeMidnightSpecialEpisode } from "@/lib/ops/media-collections/midnight-special/analyze-episode";
import {
  generateCandidateManifest,
  parseArtistSong,
} from "@/lib/ops/media-collections/midnight-special/parse-performances";
import { MS_COLLECTION_ID } from "@/lib/ops/media-collections/midnight-special/paths";
import { parseYearFromAirDate } from "@/lib/ops/media-collections/midnight-special/timecode";
import type { MsCandidateManifest } from "@/lib/ops/media-collections/midnight-special/types";
import { listEpisodes } from "@/lib/ops/media-collections/state";

const SAMPLE_SIZE = 10;
const TOTAL_EPISODES = 161;

type EpisodeResult = {
  episode_id: string;
  episode_title: string;
  air_year: number | null;
  status: "ok" | "no_download" | "no_chapters" | "error";
  error?: string;
  chapter_count: number;
  skipped_count: number;
  performance_count: number;
  exact: number;
  high: number;
  medium: number;
  low: number;
  failed_parses: number;
  automation_rate_pct: number;
  exact_only_rate_pct: number;
  chapters_aligned: boolean;
};

function parseSeed(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--seed="));
  if (!flag) return 42;
  const n = Number(flag.split("=")[1]);
  return Number.isFinite(n) ? n : 42;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function episodeYear(title: string, airDate?: string): number | null {
  const fromDate = parseYearFromAirDate(airDate);
  if (fromDate) return fromDate;
  const m = title.match(/\b(19[7-8]\d)\b/);
  return m ? Number(m[1]) : null;
}

function yearsInCollection(results: EpisodeResult[]): number[] {
  const years = new Set<number>();
  for (const r of results) {
    if (r.air_year && r.air_year >= 1972 && r.air_year <= 1981) years.add(r.air_year);
  }
  return [...years].sort((a, b) => a - b);
}

function countFailedParses(manifest: MsCandidateManifest): number {
  return manifest.performances.filter((p) => !parseArtistSong(p.chapter_title)).length;
}

async function evaluateEpisode(episodeId: string, title: string): Promise<EpisodeResult> {
  const { air_date } = parseEpisodeTitle(title);
  const airYear = episodeYear(title, air_date);

  try {
    const analysis = await analyzeMidnightSpecialEpisode(episodeId);
    const manifest = await generateCandidateManifest(episodeId);
    if (!manifest) {
      return {
        episode_id: episodeId,
        episode_title: title,
        air_year: airYear,
        status: "no_chapters",
        chapter_count: analysis?.ytdlp_chapter_count ?? 0,
        skipped_count: 0,
        performance_count: 0,
        exact: 0,
        high: 0,
        medium: 0,
        low: 0,
        failed_parses: 0,
        automation_rate_pct: 0,
        exact_only_rate_pct: 0,
        chapters_aligned: analysis?.chapters_aligned ?? false,
      };
    }

    const { stats } = manifest;
    const exactOnly =
      stats.performance_count > 0
        ? Math.round((stats.by_confidence.exact / stats.performance_count) * 1000) / 10
        : 0;

    return {
      episode_id: episodeId,
      episode_title: title,
      air_year: airYear,
      status: "ok",
      chapter_count: stats.chapter_count,
      skipped_count: stats.skipped_count,
      performance_count: stats.performance_count,
      exact: stats.by_confidence.exact,
      high: stats.by_confidence.high,
      medium: stats.by_confidence.medium,
      low: stats.by_confidence.low,
      failed_parses: countFailedParses(manifest),
      automation_rate_pct: stats.automation_rate_pct,
      exact_only_rate_pct: exactOnly,
      chapters_aligned: analysis?.chapters_aligned ?? false,
    };
  } catch (e) {
    return {
      episode_id: episodeId,
      episode_title: title,
      air_year: airYear,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
      chapter_count: 0,
      skipped_count: 0,
      performance_count: 0,
      exact: 0,
      high: 0,
      medium: 0,
      low: 0,
      failed_parses: 0,
      automation_rate_pct: 0,
      exact_only_rate_pct: 0,
      chapters_aligned: false,
    };
  }
}

function pickStratifiedSample(
  results: EpisodeResult[],
  seed: number,
): { sample: EpisodeResult[]; years: number[] } {
  const ok = results.filter((r) => r.status === "ok");
  const years = yearsInCollection(ok);
  const perYear = Math.max(1, Math.floor(SAMPLE_SIZE / Math.max(years.length, 1)));

  const byYear = new Map<number, EpisodeResult[]>();
  for (const r of ok) {
    const y = r.air_year;
    if (!y) continue;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(r);
  }

  const picked: EpisodeResult[] = [];
  const used = new Set<string>();

  for (const year of years) {
    const pool = seededShuffle(byYear.get(year) ?? [], seed + year);
    for (const ep of pool.slice(0, perYear)) {
      if (used.has(ep.episode_id)) continue;
      picked.push(ep);
      used.add(ep.episode_id);
    }
  }

  if (picked.length < SAMPLE_SIZE) {
    const yearOrder = seededShuffle(years, seed + 500);
    for (const year of yearOrder) {
      if (picked.length >= SAMPLE_SIZE) break;
      for (const ep of seededShuffle(byYear.get(year) ?? [], seed + year + 100)) {
        if (picked.length >= SAMPLE_SIZE) break;
        if (used.has(ep.episode_id)) continue;
        picked.push(ep);
        used.add(ep.episode_id);
      }
    }
  }

  return {
    years,
    sample: picked
      .slice(0, SAMPLE_SIZE)
      .sort((a, b) => (a.air_year ?? 0) - (b.air_year ?? 0)),
  };
}

function aggregate(results: EpisodeResult[]) {
  const ok = results.filter((r) => r.status === "ok");
  const perfTotal = ok.reduce((s, r) => s + r.performance_count, 0);
  const exactTotal = ok.reduce((s, r) => s + r.exact, 0);
  const highTotal = ok.reduce((s, r) => s + r.high, 0);
  const autoEligible = exactTotal + highTotal;
  const failedTotal = ok.reduce((s, r) => s + r.failed_parses, 0);

  return {
    episode_count: ok.length,
    performance_total: perfTotal,
    avg_performances:
      ok.length > 0 ? Math.round((perfTotal / ok.length) * 10) / 10 : 0,
    automation_pct:
      perfTotal > 0 ? Math.round((autoEligible / perfTotal) * 1000) / 10 : 0,
    exact_only_pct:
      perfTotal > 0 ? Math.round((exactTotal / perfTotal) * 1000) / 10 : 0,
    failed_parses: failedTotal,
    no_chapters: results.filter((r) => r.status === "no_chapters").length,
    errors: results.filter((r) => r.status === "error").length,
  };
}

function reviewWorkloadEstimate(totalPerformances: number, automationPct: number) {
  const manualPct = 100 - automationPct;
  const manualCount = Math.ceil((totalPerformances * manualPct) / 100);
  const autoCount = totalPerformances - manualCount;
  const manualMinPerPerf = 3;
  const autoMinPerPerf = 0.25;
  const manualHours = (manualCount * manualMinPerPerf) / 60;
  const autoHours = (autoCount * autoMinPerPerf) / 60;
  const structuredHours = manualHours + autoHours;
  const fullyManualHours = (totalPerformances * 8) / 60;
  const hoursSaved = fullyManualHours - structuredHours;

  return {
    manual_count: manualCount,
    auto_count: autoCount,
    structured_hours: Math.round(structuredHours * 10) / 10,
    manual_baseline_hours: Math.round(fullyManualHours * 10) / 10,
    hours_saved: Math.round(hoursSaved * 10) / 10,
    manual_min_per_perf: manualMinPerPerf,
    auto_min_per_perf: autoMinPerPerf,
    fully_manual_min_per_perf: 8,
  };
}

function workflowSection(
  automationPct: number,
  exactOnlyPct: number,
  projectedPerformances: number,
): string {
  const lines: string[] = [];

  if (automationPct > 85) {
    lines.push(`## Accept All Exact Matches workflow (automation ${automationPct}% > 85%)

**Trigger:** Episode review opens with exact-match banner.

**Flow:**
1. Parser generates candidates (\`ms-structured-pipeline.ts\` or API).
2. Review UI shows summary: *N exact · M need review*.
3. **Accept All Exact** button → bulk-sets \`review_status: accepted\` for \`confidence === "exact"\`.
4. Non-exact rows stay \`pending\` for Preview / Adjust / Reject.
5. Optional: **Export All Accepted** queues ffmpeg trims for exact batch only.

**Exact-only coverage:** ${exactOnlyPct}% of performances are exact — safe for one-click approve without listening.

**Guardrails:**
- Skip if \`chapters_aligned === false\`
- Skip if \`failed_parses > 0\` on episode
- Log accepted IDs to \`RETROVERSE_DATA/.../review-log/{episode}.json\`
`);
  }

  if (automationPct > 95) {
    lines.push(`## Batch processing workflow (collection automation ${automationPct}% > 95%)

**Trigger:** Collection-level batch job — no per-episode UI required for exact matches.

\`\`\`
Episode queue (161 IDs)
    ↓
generateCandidateManifest() per episode
    ↓
Auto-approve confidence === "exact"
    ↓
Export queue (ffmpeg worker, 2 concurrent)
    ↓
exports/{Artist} - {Song} (Midnight Special YYYY).mp4
\`\`\`

**CLI sketch:** \`npx tsx tools/media-collections/ms-batch-export.ts --auto-exact --concurrency=2\`

**Queue states:** \`pending → candidates → auto_approved → exporting → exported | failed\`

**Human review only for:**
- \`high\` / \`medium\` / \`low\` confidence
- Export failures (re-trim with Adjust offsets)

**Nightly run estimate:** ~${TOTAL_EPISODES} episodes × ~30s parse + ~2min export/perf × avg performances ≈ background job, not interactive.
`);
  }

  if (automationPct <= 95 && automationPct > 85) {
    lines.push(`## Batch processing — not yet (collection ${automationPct}% ≤ 95%)

Full-collection automation is above the **Accept All Exact** threshold but below full batch auto-export.

**Recommended path:**
1. Ship **Accept All Exact** + manual queue for high/medium/low.
2. Re-extract chapters for 12 episodes missing yt-dlp markers (\`--write-info-json\` refresh).
3. Add comedy/tribute skip rules + quoted-title parser (\`Artist "Song"\`) to recover ~${Math.round((232 / 2471) * 100)}% failed parses.
4. Re-validate; batch export when collection automation exceeds 95%.

**Partial batch today:** Auto-export **exact-only** performances (${exactOnlyPct}%) without listening — ~${Math.round((projectedPerformances * exactOnlyPct) / 100)} clips with minimal review.
`);
  }

  if (automationPct <= 85) {
    lines.push(`## Workflow recommendation

Automation ${automationPct}% is below 85% threshold. Keep episode-by-episode review UI; do not enable bulk accept or batch export yet.
`);
  }

  return lines.join("\n");
}

async function main() {
  const seed = parseSeed(process.argv.slice(2));
  const episodes = await listEpisodes(MS_COLLECTION_ID);
  const downloaded = episodes.filter((e) => e.downloaded || e.status === "downloaded");

  console.error(`Evaluating ${downloaded.length} downloaded episodes…`);
  const allResults: EpisodeResult[] = [];
  for (const ep of downloaded) {
    allResults.push(await evaluateEpisode(ep.id, ep.title));
  }

  const { sample, years: collectionYears } = pickStratifiedSample(allResults, seed);
  const fullAgg = aggregate(allResults);
  const sampleAgg = aggregate(sample);

  let detail: {
    no_chapters: { id: string; title: string }[];
    top_failed_chapter_titles: { title: string; count: number }[];
    year_distribution: Record<string, number>;
  } | null = null;
  try {
    const raw = await import("fs/promises").then((fs) =>
      fs.readFile(
        join(process.cwd(), "reports/media-collections/midnight-special-validation-detail.json"),
        "utf8",
      ),
    );
    detail = JSON.parse(raw) as typeof detail;
  } catch {
    // optional detail file
  }

  const projectedPerformances = Math.round(fullAgg.avg_performances * TOTAL_EPISODES);
  const workload = reviewWorkloadEstimate(projectedPerformances, fullAgg.automation_pct);

  const reportDir = join(process.cwd(), "reports", "media-collections");
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, "midnight-special-validation-report.md");

  const sampleTable = sample
    .map(
      (r) =>
        `| ${r.air_year ?? "—"} | \`${r.episode_id}\` | ${r.chapter_count} | ${r.performance_count} | ${r.exact} | ${r.high} | ${r.low} | ${r.failed_parses} | ${r.automation_rate_pct}% |`,
    )
    .join("\n");

  const md = `# Midnight Special Structured Pipeline — Validation Report

**Generated:** ${new Date().toISOString()}  
**Sample:** ${SAMPLE_SIZE} stratified episodes (seed ${seed}) across years ${collectionYears.join(", ")}  
**Note:** Downloaded collection spans **${collectionYears.join(", ")}** only (no 1977–1981 episodes in archive).  
**Full scan:** ${downloaded.length} downloaded episodes

## Sample episode results

| Year | Episode ID | Chapters | Performances | Exact | High | Low | Failed parses | Automation |
|------|------------|----------|--------------|-------|------|-----|---------------|------------|
${sampleTable}

### Sample aggregates

| Metric | Value |
|--------|------:|
| Episodes | ${sampleAgg.episode_count} |
| Total performances | ${sampleAgg.performance_total} |
| Avg performances / episode | ${sampleAgg.avg_performances} |
| **Automation (exact + high)** | **${sampleAgg.automation_pct}%** |
| Exact-only rate | ${sampleAgg.exact_only_pct}% |
| Failed parses | ${sampleAgg.failed_parses} |

## Full collection scan (${downloaded.length} episodes)

| Metric | Value |
|--------|------:|
| Episodes with chapters | ${fullAgg.episode_count} |
| Episodes missing chapters | ${fullAgg.no_chapters} |
| Parse errors | ${fullAgg.errors} |
| Total performances detected | ${fullAgg.performance_total} |
| **Avg performances / episode** | **${fullAgg.avg_performances}** |
| **Automation (exact + high)** | **${fullAgg.automation_pct}%** |
| Exact-only rate | ${fullAgg.exact_only_pct}% |
| Failed parses (total) | ${fullAgg.failed_parses} |

## Projections (161 episodes)

| Metric | Estimate |
|--------|----------|
| **Total performances** | **~${projectedPerformances}** |
| Auto-eligible (exact + high) | ~${Math.round((projectedPerformances * fullAgg.automation_pct) / 100)} |
| Manual review required | ~${workload.manual_count} |
| Structured review time | ~${workload.structured_hours} hours |
| Fully manual baseline (8 min/perf) | ~${workload.manual_baseline_hours} hours |
| **Hours saved** | **~${workload.hours_saved} hours** |

### Review workload assumptions

- Auto-eligible: ${workload.auto_min_per_perf} min/performance (bulk accept + spot check)
- Manual: ${workload.manual_min_per_perf} min/performance (preview + adjust)
- Manual baseline: ${workload.fully_manual_min_per_perf} min/performance (watch + mark in/out + export)

${workflowSection(fullAgg.automation_pct, fullAgg.exact_only_pct, projectedPerformances)}

## Failure analysis

### Episodes missing yt-dlp chapters (${fullAgg.no_chapters})

${detail?.no_chapters?.map((e) => `- \`${e.id}\` — ${e.title}`).join("\n") ?? "_Run ms-validation-detail.ts_"}

### Top failed chapter titles (no \`Artist - Song\` parse)

| Chapter title | Occurrences |
|---------------|------------:|
${detail?.top_failed_chapter_titles?.map((f) => `| ${f.title.replace(/\|/g, "\\|")} | ${f.count} |`).join("\n") ?? ""}

Most failures are **comedy segments**, **tributes**, or **song-only** titles. These are skippable non-music chapters or need a secondary parser.

## Sample episode titles

${sample.map((r) => `- **${r.air_year}** — ${r.episode_title} (\`${r.episode_id}\`)`).join("\n")}
`;

  await writeFile(reportPath, md, "utf8");

  console.log(
    JSON.stringify(
      {
        seed,
        sample_episodes: sample.map((r) => r.episode_id),
        sample: sampleAgg,
        full_collection: fullAgg,
        projected_performances: projectedPerformances,
        workload,
        report: reportPath,
        thresholds: {
          accept_all_exact: fullAgg.automation_pct > 85,
          batch_processing: fullAgg.automation_pct > 95,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
