#!/usr/bin/env npx tsx
/**
 * Overnight intelligence build — Top 500 VIDEO · RVTR + cover · full pipeline.
 *
 * Usage:
 *   npm run intelligence:overnight-build
 *   npm run intelligence:overnight-build -- --limit 250
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  computeArtifactReadiness,
  packageConfidence,
} from "../../lib/ops/intelligence/artifact-readiness.ts";
import { runForcedProductionPipeline } from "../../lib/ops/intelligence/production-pipeline.ts";
import {
  avgRunRuntimeMs,
  computeRunEta,
  OVERNIGHT_COHORT_LIMIT,
  OVERNIGHT_RUN_ID,
  saveIntelligenceRunProgress,
  type IntelligenceRunProgress,
  type IntelligenceRunRecentSong,
} from "../../lib/ops/intelligence/run-progress.ts";
import { loadTopPipelineEligible } from "../../lib/ops/intelligence/top-played-backfill.ts";

const RUN_DIR = join(process.cwd(), "reports/intelligence/runs", OVERNIGHT_RUN_ID);
const REPORT_PATH = join(process.cwd(), "reports/intelligence/overnight-build-report.md");

type BatchResult = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  coverSource: string | null;
  status: "completed" | "failed";
  runtimeMs: number;
  sources: number;
  facts: number;
  stories: number;
  confidence: number;
  artifacts: ReturnType<typeof computeArtifactReadiness>;
  error?: string;
};

function parseLimit(): number {
  const idx = process.argv.indexOf("--limit");
  if (idx >= 0) {
    const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return OVERNIGHT_COHORT_LIMIT;
}

function toRecentSong(r: BatchResult): IntelligenceRunRecentSong {
  return {
    rvtr: r.rvtr,
    title: r.title,
    artist: r.artist,
    playCount: r.playCount,
    status: r.status,
    runtimeMs: r.runtimeMs,
    confidence: r.confidence,
    facts: r.facts,
    stories: r.stories,
    artifactsReady: r.artifacts.allReady,
    error: r.error,
    completedAt: new Date().toISOString(),
  };
}

function buildProgress(
  cohortLimit: number,
  total: number,
  results: BatchResult[],
  current: IntelligenceRunProgress["currentSong"],
  startedAt: string,
  status: IntelligenceRunProgress["status"],
): IntelligenceRunProgress {
  const completed = results.length;
  const failures = results.filter((r) => r.status === "failed").length;
  const recentCompleted = results.map(toRecentSong).slice(-25).reverse();
  return {
    version: 1,
    runId: OVERNIGHT_RUN_ID,
    label: "Overnight Intelligence Build",
    cohortLimit,
    status,
    startedAt,
    updatedAt: new Date().toISOString(),
    total,
    completed,
    remaining: Math.max(0, total - completed),
    successes: completed - failures,
    failures,
    currentSong: current,
    eta: computeRunEta(completed, total, recentCompleted),
    avgRuntimeMs: avgRunRuntimeMs(recentCompleted),
    recentCompleted,
  };
}

function confidenceBucket(conf: number): string {
  if (conf >= 90) return "90–100%";
  if (conf >= 80) return "80–89%";
  if (conf >= 70) return "70–79%";
  if (conf >= 60) return "60–69%";
  return "<60%";
}

function topFailureReasons(results: BatchResult[]): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of results.filter((x) => x.status === "failed")) {
    const key = r.error ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

function buildReport(
  cohortLimit: number,
  eligible: number,
  results: BatchResult[],
  startedAt: string,
  finishedAt: string,
): string {
  const completed = results.filter((r) => r.status === "completed");
  const failed = results.filter((r) => r.status === "failed");
  const attempted = results.length;
  const totalRuntimeMs = results.reduce((n, r) => n + r.runtimeMs, 0);
  const avgRuntimeSec =
    attempted > 0 ? Math.round(totalRuntimeMs / attempted / 1000) : 0;
  const avgConf =
    completed.length > 0
      ? Math.round(completed.reduce((n, r) => n + r.confidence, 0) / completed.length)
      : 0;
  const avgFacts =
    completed.length > 0
      ? Math.round(completed.reduce((n, r) => n + r.facts, 0) / completed.length)
      : 0;
  const avgStories =
    completed.length > 0
      ? Math.round(completed.reduce((n, r) => n + r.stories, 0) / completed.length)
      : 0;
  const fullArtifacts = completed.filter((r) => r.artifacts.allReady).length;

  const confDist = new Map<string, number>();
  for (const r of completed) {
    const b = confidenceBucket(r.confidence);
    confDist.set(b, (confDist.get(b) ?? 0) + 1);
  }

  const topByConfidence = [...completed]
    .sort((a, b) => b.confidence - a.confidence || b.facts - a.facts)
    .slice(0, 15);
  const topByFacts = [...completed]
    .sort((a, b) => b.facts - a.facts || b.confidence - a.confidence)
    .slice(0, 15);
  const topByPlays = [...completed].sort((a, b) => b.playCount - a.playCount).slice(0, 15);

  const failureReasons = topFailureReasons(results);

  const lines = [
    "# Overnight Intelligence Build Report",
    "",
    `Generated: ${finishedAt}`,
    `Started: ${startedAt}`,
    `Cohort: Top ${cohortLimit} VIDEO tracks · play count DESC`,
    `Eligibility: RVTR resolved · cover art · VIDEO only · confidence gates`,
    `Eligible in cohort: ${eligible}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Songs attempted | ${attempted} |`,
    `| Successes | ${completed.length} |`,
    `| Failures | ${failed.length} |`,
    `| Success rate | ${attempted > 0 ? Math.round((completed.length / attempted) * 100) : 0}% |`,
    `| Total runtime | ${Math.round(totalRuntimeMs / 60000)} min |`,
    `| Avg runtime / song | ${avgRuntimeSec}s |`,
    `| Avg confidence | ${avgConf}% |`,
    `| Avg facts / package | ${avgFacts} |`,
    `| Avg stories / package | ${avgStories} |`,
    `| Full artifacts (4/4) | ${fullArtifacts} |`,
    "",
    "## Runtime Statistics",
    "",
    `| Percentile | Runtime |`,
    "| --- | ---: |",
  ];

  const runtimes = [...results.map((r) => r.runtimeMs)].sort((a, b) => a - b);
  if (runtimes.length > 0) {
    const pct = (p: number) => runtimes[Math.min(runtimes.length - 1, Math.floor((p / 100) * runtimes.length))]!;
    lines.push(
      `| Min | ${Math.round(pct(0) / 1000)}s |`,
      `| Median (p50) | ${Math.round(pct(50) / 1000)}s |`,
      `| p90 | ${Math.round(pct(90) / 1000)}s |`,
      `| Max | ${Math.round(pct(100) / 1000)}s |`,
    );
  } else {
    lines.push("| — | — |");
  }

  lines.push("", "## Fact Counts (completed)", "");
  const factDist = new Map<number, number>();
  for (const r of completed) {
    factDist.set(r.facts, (factDist.get(r.facts) ?? 0) + 1);
  }
  lines.push("| Facts | Packages |", "| ---: | ---: |");
  for (const [facts, count] of [...factDist.entries()].sort((a, b) => b[0] - a[0]).slice(0, 12)) {
    lines.push(`| ${facts} | ${count} |`);
  }

  lines.push("", "## Story Counts (completed)", "");
  const storyDist = new Map<number, number>();
  for (const r of completed) {
    storyDist.set(r.stories, (storyDist.get(r.stories) ?? 0) + 1);
  }
  lines.push("| Stories | Packages |", "| ---: | ---: |");
  for (const [stories, count] of [...storyDist.entries()].sort((a, b) => b[0] - a[0]).slice(0, 12)) {
    lines.push(`| ${stories} | ${count} |`);
  }

  lines.push("", "## Confidence Distribution", "");
  lines.push("| Bucket | Packages |", "| --- | ---: |");
  for (const bucket of ["90–100%", "80–89%", "70–79%", "60–69%", "<60%"]) {
    const n = confDist.get(bucket) ?? 0;
    if (n > 0) lines.push(`| ${bucket} | ${n} |`);
  }

  lines.push("", "## Top Packages by Confidence", "");
  lines.push("| Song | RVTR | Conf | Facts | Stories | Plays |", "| --- | --- | ---: | ---: | ---: | ---: |");
  for (const r of topByConfidence) {
    lines.push(
      `| ${r.title} | ${r.rvtr} | ${r.confidence}% | ${r.facts} | ${r.stories} | ${r.playCount} |`,
    );
  }

  lines.push("", "## Top Packages by Fact Count", "");
  lines.push("| Song | RVTR | Facts | Conf | Plays |", "| --- | --- | ---: | ---: | ---: |");
  for (const r of topByFacts) {
    lines.push(`| ${r.title} | ${r.rvtr} | ${r.facts} | ${r.confidence}% | ${r.playCount} |`);
  }

  lines.push("", "## Highest Play Count Completed", "");
  lines.push("| Song | RVTR | Plays | Conf | Facts |", "| --- | --- | ---: | ---: | ---: |");
  for (const r of topByPlays) {
    lines.push(`| ${r.title} | ${r.rvtr} | ${r.playCount} | ${r.confidence}% | ${r.facts} |`);
  }

  if (failed.length > 0) {
    lines.push("", "## Failures", "");
    lines.push("| Song | RVTR | Plays | Reason |", "| --- | --- | ---: | --- |");
    for (const r of failed.sort((a, b) => b.playCount - a.playCount)) {
      lines.push(`| ${r.title} | ${r.rvtr} | ${r.playCount} | ${r.error ?? "unknown"} |`);
    }
    lines.push("", "### Failure Reasons", "");
    for (const { reason, count } of failureReasons) {
      lines.push(`- **${reason}**: ${count}`);
    }
  }

  lines.push(
    "",
    "## Dashboard",
    "",
    "Live progress: `/ops/intelligence/runs/current`",
    "",
    "Raw results: `reports/intelligence/runs/current/results.json`",
    "",
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const { assertIntelligenceNotBlocked } = await import(
    "../../lib/ops/intelligence/intelligence-cover-hold.ts"
  );
  await assertIntelligenceNotBlocked("Overnight intelligence build");

  const cohortLimit = parseLimit();
  await mkdir(RUN_DIR, { recursive: true });

  const eligible = await loadTopPipelineEligible(cohortLimit);
  console.log(`\nOvernight Intelligence Build`);
  console.log(`  Cohort: Top ${cohortLimit} VIDEO · play count DESC`);
  console.log(`  Eligible: ${eligible.length} (RVTR + cover + confidence OK)\n`);

  const results: BatchResult[] = [];
  const startedAt = new Date().toISOString();
  const total = eligible.length;

  for (let i = 0; i < eligible.length; i++) {
    const track = eligible[i]!;
    const current = {
      rvtr: track.rvtr!,
      title: track.title,
      artist: track.artist,
      playCount: track.playCount,
      index: i + 1,
    };

    await saveIntelligenceRunProgress(
      buildProgress(cohortLimit, total, results, current, startedAt, "running"),
    );

    console.log(
      `[${i + 1}/${eligible.length}] ${track.rvtr} — ${track.title} (${track.playCount} plays)`,
    );

    const t0 = Date.now();
    let outcome;
    try {
      outcome = await runForcedProductionPipeline(track.rvtr!);
    } catch (err) {
      outcome = {
        ok: false as const,
        published: false,
        error: err instanceof Error ? err.message : "pipeline_exception",
      };
    }
    const runtimeMs = Date.now() - t0;

    if (outcome.ok && outcome.published) {
      const pkg = outcome.package;
      const artifacts = computeArtifactReadiness(pkg);
      const confidence = packageConfidence(pkg);
      results.push({
        rvtr: track.rvtr!,
        title: pkg.metadata.title,
        artist: pkg.metadata.artist,
        playCount: track.playCount,
        coverSource: track.coverSource,
        status: "completed",
        runtimeMs,
        sources: pkg.researchVault.length,
        facts: outcome.approvedFacts,
        stories: pkg.storyCards.filter((c) => c.rank > 0).length,
        confidence,
        artifacts,
      });
      console.log(
        `  ✓ ${Math.round(runtimeMs / 1000)}s · ${confidence}% · ${outcome.approvedFacts} facts · ${artifacts.allReady ? "artifacts ok" : "artifacts partial"}`,
      );
    } else {
      results.push({
        rvtr: track.rvtr!,
        title: track.title,
        artist: track.artist,
        playCount: track.playCount,
        coverSource: track.coverSource,
        status: "failed",
        runtimeMs,
        sources: 0,
        facts: 0,
        stories: 0,
        confidence: 0,
        artifacts: {
          record_label: false,
          timeline: false,
          story_constellation: false,
          song_dna: false,
          allReady: false,
        },
        error: outcome.error ?? "pipeline_failed",
      });
      console.log(`  ✗ ${outcome.error ?? "failed"} — continuing`);
    }

    await saveIntelligenceRunProgress(
      buildProgress(cohortLimit, total, results, null, startedAt, "running"),
    );
  }

  const finishedAt = new Date().toISOString();
  const done = results.filter((r) => r.status === "completed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  await writeFile(join(RUN_DIR, "results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await writeFile(REPORT_PATH, buildReport(cohortLimit, eligible.length, results, startedAt, finishedAt), "utf8");

  await saveIntelligenceRunProgress({
    ...buildProgress(cohortLimit, total, results, null, startedAt, "complete"),
    remaining: 0,
    eta: null,
  });

  console.log(`\nAttempted: ${results.length}`);
  console.log(`Successes: ${done}`);
  console.log(`Failures:  ${failed}`);
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Dashboard: /ops/intelligence/runs/current\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
