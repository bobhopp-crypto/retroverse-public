#!/usr/bin/env npx tsx
/**
 * VIDEO validation batch — top 25 most-played VIDEO tracks with RVTR + cover.
 *
 * Usage:
 *   npm run intelligence:video-validation
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { chromium } from "playwright";

import { computeArtifactReadiness, packageConfidence } from "../../lib/ops/intelligence/artifact-readiness.ts";
import { loadVideoBackfillCoverage } from "../../lib/ops/intelligence/backfill-coverage.ts";
import { runForcedProductionPipeline } from "../../lib/ops/intelligence/production-pipeline.ts";

const OUT = join(process.cwd(), "reports/intelligence/validation-batch");
const SCREEN = join(OUT, "screenshots");
const BASE = process.env.SONG_SHEET_BASE_URL ?? "http://localhost:3000";
const COHORT_SIZE = 25;

type Result = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  coverSource: string | null;
  runtimeMs: number;
  sources: number;
  facts: number;
  stories: number;
  confidence: number;
  artifacts: ReturnType<typeof computeArtifactReadiness>;
  success: boolean;
  screenshot?: string;
};

async function capture(rvtrs: string[]) {
  await mkdir(SCREEN, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const paths = new Map<string, string>();

  for (const rvtr of rvtrs) {
    const file = `${rvtr}-artifacts.png`;
    try {
      await page.goto(`${BASE}/rvtr/${rvtr}/song-sheet`, { waitUntil: "networkidle", timeout: 90_000 });
      await page.screenshot({ path: join(SCREEN, file), fullPage: true });
      paths.set(rvtr, `screenshots/${file}`);
    } catch {
      /* page may 404 if not published */
    }
  }
  await browser.close();
  return paths;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const { videos } = await loadVideoBackfillCoverage();

  const cohort = videos.filter((v) => v.hasCover).slice(0, COHORT_SIZE);

  console.log(`\nVIDEO Validation — top ${cohort.length} by play count (RVTR + cover)\n`);
  const results: Result[] = [];

  for (let i = 0; i < cohort.length; i++) {
    const song = cohort[i]!;
    console.log(
      `[${i + 1}/${cohort.length}] ${song.rvtr} — ${song.title} (${song.playCount.toLocaleString()} plays)`,
    );
    const t0 = Date.now();
    const outcome = await runForcedProductionPipeline(song.rvtr);
    const runtimeMs = Date.now() - t0;

    if (outcome.ok && outcome.published) {
      const pkg = outcome.package;
      const artifacts = computeArtifactReadiness(pkg);
      results.push({
        rvtr: song.rvtr,
        title: pkg.metadata.title,
        artist: pkg.metadata.artist,
        playCount: song.playCount,
        coverSource: song.coverSource,
        runtimeMs,
        sources: pkg.researchVault.length,
        facts: outcome.approvedFacts,
        stories: pkg.storyCards.filter((c) => c.rank > 0).length,
        confidence: packageConfidence(pkg),
        artifacts,
        success: artifacts.allReady,
      });
      console.log(`  ✓ ${Math.round(runtimeMs / 1000)}s conf=${packageConfidence(pkg)}%`);
    } else {
      results.push({
        rvtr: song.rvtr,
        title: song.title,
        artist: song.artist,
        playCount: song.playCount,
        coverSource: song.coverSource,
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
        success: false,
      });
      console.log(`  ✗ ${outcome.error}`);
    }
  }

  const published = results.filter((r) => r.sources > 0);
  const shots = await capture(published.map((r) => r.rvtr));
  for (const r of results) {
    const p = shots.get(r.rvtr);
    if (p) r.screenshot = p;
  }

  const avgRuntime = Math.round(results.reduce((n, r) => n + r.runtimeMs, 0) / Math.max(1, results.length) / 1000);
  const lines = [
    "# VIDEO Validation Batch Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Cohort: Top ${COHORT_SIZE} most-played VIDEO tracks with RVTR + cover`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Songs processed | ${results.length} |`,
    `| Published | ${published.length} |`,
    `| Full artifacts | ${results.filter((r) => r.success).length} |`,
    `| Avg runtime | ${avgRuntime}s |`,
    `| Avg confidence | ${published.length ? Math.round(published.reduce((n, r) => n + r.confidence, 0) / published.length) : 0}% |`,
    "",
    "## Per Song",
    "",
    "| Song | Plays | Cover | Runtime | Sources | Facts | Stories | Artifacts | Conf |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: |",
  ];

  for (const r of results) {
    const artifactCount = [
      r.artifacts.record_label,
      r.artifacts.timeline,
      r.artifacts.story_constellation,
      r.artifacts.song_dna,
    ].filter(Boolean).length;
    lines.push(
      `| ${r.title} | ${r.playCount.toLocaleString()} | ${r.coverSource ?? "—"} | ${Math.round(r.runtimeMs / 1000)}s | ${r.sources} | ${r.facts} | ${r.stories} | ${artifactCount}/4 | ${r.confidence}% |`,
    );
  }

  lines.push("", "## Runtime Benchmarks", "", "| RVTR | Plays | Runtime (s) |", "| --- | ---: | ---: |");
  for (const r of results) {
    lines.push(`| ${r.rvtr} | ${r.playCount.toLocaleString()} | ${Math.round(r.runtimeMs / 1000)} |`);
  }

  lines.push("", "## Screenshots", "");
  for (const r of published) {
    lines.push(`### ${r.title} — ${r.artist}`);
    if (r.screenshot) lines.push(`![${r.rvtr}](${r.screenshot})`);
    lines.push("");
  }

  const reportPath = join(OUT, "VALIDATION-REPORT.md");
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  await writeFile(join(OUT, "results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");

  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
