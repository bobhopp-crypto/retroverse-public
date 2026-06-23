#!/usr/bin/env npx tsx
/**
 * Top 100 validation batch — VIDEO · cover + RVTR · full pipeline + gallery.
 *
 * Usage:
 *   npm run intelligence:top100-validation
 *   npm run intelligence:top100-validation -- --no-screenshots
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { chromium } from "playwright";

import {
  computeArtifactReadiness,
  packageConfidence,
} from "../../lib/ops/intelligence/artifact-readiness.ts";
import { runForcedProductionPipeline } from "../../lib/ops/intelligence/production-pipeline.ts";
import {
  avgRuntimeMs,
  computeValidationEta,
  saveTop100ValidationProgress,
  type Top100ValidationProgress,
  type Top100ValidationRecentSong,
} from "../../lib/ops/intelligence/top100-validation-progress.ts";
import { loadTop100PipelineEligible } from "../../lib/ops/intelligence/top-played-backfill.ts";

const OUT = join(process.cwd(), "reports/intelligence/top100-validation");
const SCREEN = join(OUT, "screenshots");
const BASE = process.env.SONG_SHEET_BASE_URL ?? "http://localhost:3000";

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
  songSheetShot?: string;
  artifactShot?: string;
};

function toRecentSong(r: BatchResult): Top100ValidationRecentSong {
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
  total: number,
  results: BatchResult[],
  current: { rvtr: string; title: string; artist: string; playCount: number; index: number } | null,
  startedAt: string,
  status: Top100ValidationProgress["status"],
): Top100ValidationProgress {
  const completed = results.length;
  const failures = results.filter((r) => r.status === "failed").length;
  const recentCompleted = results.map(toRecentSong).slice(-10).reverse();
  return {
    version: 1,
    status,
    startedAt,
    updatedAt: new Date().toISOString(),
    total,
    completed,
    remaining: Math.max(0, total - completed),
    failures,
    currentSong: current,
    eta: computeValidationEta(completed, total, recentCompleted),
    avgRuntimeMs: avgRuntimeMs(recentCompleted),
    recentCompleted,
  };
}

function topFailureReason(results: BatchResult[]): string {
  const counts = new Map<string, number>();
  for (const r of results.filter((x) => x.status === "failed")) {
    const key = r.error ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "none";
  let max = 0;
  for (const [k, n] of counts) {
    if (n > max) {
      max = n;
      best = k;
    }
  }
  return max > 0 ? `${best} (${max})` : "none";
}

async function captureGallery(rvtrs: string[]) {
  await mkdir(SCREEN, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const shots = new Map<string, { songSheet?: string; artifacts?: string }>();

  for (const rvtr of rvtrs) {
    const entry: { songSheet?: string; artifacts?: string } = {};
    try {
      const songFile = `${rvtr}-song-sheet.png`;
      await page.goto(`${BASE}/rvtr/${rvtr}/song-sheet`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await page.screenshot({ path: join(SCREEN, songFile), fullPage: true });
      entry.songSheet = `screenshots/${songFile}`;
    } catch {
      /* 404 if not published */
    }
    try {
      const artFile = `${rvtr}-artifacts.png`;
      await page.goto(`${BASE}/ops/intelligence/package/${rvtr}/artifacts`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await page.screenshot({ path: join(SCREEN, artFile), fullPage: true });
      entry.artifacts = `screenshots/${artFile}`;
    } catch {
      /* ops gate or missing package */
    }
    shots.set(rvtr, entry);
  }
  await browser.close();
  return shots;
}

function buildGalleryHtml(completed: BatchResult[]) {
  const top25 = [...completed]
    .filter((r) => r.status === "completed")
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 25);

  const cards = top25
    .map((r) => {
      const songImg = r.songSheetShot
        ? `<img src="${r.songSheetShot}" alt="${r.title} song sheet" loading="lazy" />`
        : `<p class="missing">No song sheet capture</p>`;
      const artImg = r.artifactShot
        ? `<img src="${r.artifactShot}" alt="${r.title} artifacts" loading="lazy" />`
        : `<p class="missing">No artifact capture</p>`;
      return `
      <article class="card">
        <header>
          <h2>${r.title}</h2>
          <p class="artist">${r.artist}</p>
          <p class="meta">${r.playCount} plays · ${r.rvtr} · ${r.confidence}% conf · ${Math.round(r.runtimeMs / 1000)}s</p>
        </header>
        <div class="pair">
          <div>
            <h3>Song Sheet</h3>
            ${songImg}
            <a href="${BASE}/rvtr/${r.rvtr}/song-sheet" target="_blank" rel="noreferrer">Open song sheet</a>
          </div>
          <div>
            <h3>Artifact Studio</h3>
            ${artImg}
            <a href="${BASE}/ops/intelligence/package/${r.rvtr}/artifacts" target="_blank" rel="noreferrer">Open artifacts</a>
          </div>
        </div>
        <p class="stats">${r.facts} facts · ${r.stories} stories · artifacts ${r.artifacts.allReady ? "✓" : "partial"}</p>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Top 100 Validation Gallery</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #faf6ee; color: #111; margin: 0; padding: 2rem; }
    h1 { font-size: 2rem; margin: 0 0 0.5rem; }
    .lead { font-size: 1.1rem; margin-bottom: 2rem; }
    .card { background: #fff; border: 3px solid #111; padding: 1.25rem; margin-bottom: 2rem; }
    .card h2 { margin: 0; font-size: 1.5rem; }
    .artist { margin: 0.25rem 0; opacity: 0.8; }
    .meta, .stats { font-size: 0.95rem; font-weight: 600; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
    img { width: 100%; border: 2px solid #111; display: block; }
    a { display: inline-block; margin-top: 0.5rem; color: #0d5c4b; font-weight: 700; }
    .missing { opacity: 0.6; font-style: italic; }
    @media (max-width: 800px) { .pair { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Top 25 · Validation Gallery</h1>
  <p class="lead">Song packages + Artifact Studio — highest play count among completed Top 100 batch</p>
  ${cards || "<p>No completed packages to display.</p>"}
</body>
</html>`;
}

async function main() {
  const { assertIntelligenceNotBlocked } = await import(
    "../../lib/ops/intelligence/intelligence-cover-hold.ts"
  );
  await assertIntelligenceNotBlocked("Top 100 validation batch");

  const skipShots = process.argv.includes("--no-screenshots");
  await mkdir(OUT, { recursive: true });

  const eligible = await loadTop100PipelineEligible();
  console.log(`\nTop 100 Validation Batch`);
  console.log(`  Eligible: ${eligible.length} (cover + RVTR + confidence OK)\n`);

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
    await saveTop100ValidationProgress(
      buildProgress(total, results, current, startedAt, "running"),
    );

    console.log(
      `[${i + 1}/${eligible.length}] ${track.rvtr} — ${track.title} (${track.playCount} plays)`,
    );
    const t0 = Date.now();
    const outcome = await runForcedProductionPipeline(track.rvtr!);
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
      console.log(`  ✗ ${outcome.error ?? "failed"}`);
    }

    await saveTop100ValidationProgress(
      buildProgress(total, results, null, startedAt, "running"),
    );
  }

  const completed = results.filter((r) => r.status === "completed");
  if (!skipShots && completed.length > 0) {
    console.log("\nCapturing gallery screenshots (top 25)…");
    const top25Rvtrs = [...completed]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 25)
      .map((r) => r.rvtr);
    const shots = await captureGallery(top25Rvtrs);
    for (const r of results) {
      const s = shots.get(r.rvtr);
      if (s) {
        r.songSheetShot = s.songSheet;
        r.artifactShot = s.artifacts;
      }
    }
  }

  const attempted = results.length;
  const done = completed.length;
  const failed = results.filter((r) => r.status === "failed").length;
  const avgRuntime =
    attempted > 0 ? Math.round(results.reduce((n, r) => n + r.runtimeMs, 0) / attempted / 1000) : 0;
  const avgConf =
    done > 0 ? Math.round(completed.reduce((n, r) => n + r.confidence, 0) / done) : 0;
  const failureTop = topFailureReason(results);

  const lines = [
    "# Top 100 Validation Batch Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Eligible cohort: ${eligible.length} tracks (VIDEO · cover · RVTR · confidence ≥78%)`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Songs attempted | ${attempted} |`,
    `| Songs completed | ${done} |`,
    `| Songs failed | ${failed} |`,
    `| Avg runtime | ${avgRuntime}s |`,
    `| Avg confidence | ${avgConf}% |`,
    `| Most common failure | ${failureTop} |`,
    `| Full artifacts | ${completed.filter((r) => r.artifacts.allReady).length} |`,
    "",
    "## Per Song",
    "",
    "| Plays | Song | Status | Runtime | Facts | Stories | Conf | Artifacts |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const r of [...results].sort((a, b) => b.playCount - a.playCount)) {
    const art = [
      r.artifacts.record_label,
      r.artifacts.timeline,
      r.artifacts.story_constellation,
      r.artifacts.song_dna,
    ].filter(Boolean).length;
    lines.push(
      `| ${r.playCount} | ${r.title} | ${r.status} | ${Math.round(r.runtimeMs / 1000)}s | ${r.facts} | ${r.stories} | ${r.confidence}% | ${art}/4 |`,
    );
  }

  if (failed > 0) {
    lines.push("", "## Failures", "");
    for (const r of results.filter((x) => x.status === "failed")) {
      lines.push(`- **${r.title}** (${r.rvtr}): ${r.error}`);
    }
  }

  lines.push("", "## Gallery", "", "Open `gallery.html` for top 25 song sheet + artifact studio captures.", "");

  const reportPath = join(OUT, "VALIDATION-REPORT.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(join(OUT, "results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await writeFile(join(OUT, "gallery.html"), buildGalleryHtml(results), "utf8");

  await saveTop100ValidationProgress({
    ...buildProgress(total, results, null, startedAt, "complete"),
    remaining: 0,
    eta: null,
  });

  console.log(`\nAttempted:  ${attempted}`);
  console.log(`Completed:  ${done}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Avg runtime:${avgRuntime}s`);
  console.log(`Avg conf:   ${avgConf}%`);
  console.log(`Top failure:${failureTop}`);
  console.log(`\nReport:  ${reportPath}`);
  console.log(`Gallery: ${join(OUT, "gallery.html")}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
