#!/usr/bin/env node
/**
 * Collector overnight production batch — unattended queue drain with resume.
 *
 * Usage:
 *   npm run research:collector:overnight
 *   npm run research:collector:overnight -- --limit 200
 *   npm run research:collector:overnight -- --force
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  markCollectorIdle,
  markCollectorWaiting,
  recordCollectorCompletion,
  runCollectorForSong,
} from "../../lib/ops/studio/collector/run-collector.ts";
import { selectCollectorOvernightQueue } from "../../lib/ops/studio/collector/overnight-queue.ts";
import {
  emptyCollectorProgress,
  loadCollectorProgress,
  saveCollectorProgress,
} from "../../lib/ops/studio/collector/store.ts";
import { COLLECTOR_STAGE_TOTAL } from "../../lib/ops/studio/collector/types.ts";

const REPORT_DIR = join(process.cwd(), "reports/collector");
const REPORT_PATH = join(REPORT_DIR, "OVERNIGHT_BATCH_REPORT.md");
const RESULTS_PATH = join(REPORT_DIR, "overnight-results.json");

type BatchRow = {
  rvtr: string;
  artist: string;
  title: string;
  playCount: number;
  reason: string;
  status: "completed" | "failed";
  runtimeMs: number;
  researchQuality: number | null;
  lyricsAvailable: boolean;
  lyricsLines: number | null;
  error?: string;
};

function parseLimit(): number {
  const idx = process.argv.indexOf("--limit");
  if (idx >= 0) {
    const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const env = Number.parseInt(process.env.COLLECTOR_OVERNIGHT_LIMIT ?? "", 10);
  if (Number.isFinite(env) && env > 0) return env;
  return 0;
}

function buildReport(rows: BatchRow[], startedAt: string, finishedAt: string): string {
  const completed = rows.filter((r) => r.status === "completed");
  const failed = rows.filter((r) => r.status === "failed");
  const withLyrics = completed.filter((r) => r.lyricsAvailable);
  const totalMs = rows.reduce((n, r) => n + r.runtimeMs, 0);

  return [
    "# Collector Overnight Batch Report",
    "",
    `Generated: ${finishedAt}`,
    `Started: ${startedAt}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Attempted | ${rows.length} |`,
    `| Completed | ${completed.length} |`,
    `| Failed | ${failed.length} |`,
    `| Lyrics captured | ${withLyrics.length} |`,
    `| Total runtime | ${Math.round(totalMs / 60000)} min |`,
    `| Avg runtime / song | ${rows.length ? Math.round(totalMs / rows.length / 1000) : 0}s |`,
    "",
    "## Completed (by play count)",
    "",
    "| Song | RVTR | Plays | Quality | Lyrics | Lines | Runtime |",
    "| --- | --- | ---: | ---: | --- | ---: | ---: |",
    ...completed
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 100)
      .map(
        (r) =>
          `| ${r.title} | ${r.rvtr} | ${r.playCount} | ${r.researchQuality ?? "—"} | ${r.lyricsAvailable ? "yes" : "no"} | ${r.lyricsLines ?? "—"} | ${Math.round(r.runtimeMs / 1000)}s |`,
      ),
    failed.length
      ? [
          "",
          "## Failures",
          "",
          "| Song | RVTR | Reason |",
          "| --- | --- | --- |",
          ...failed.map((r) => `| ${r.title} | ${r.rvtr} | ${r.error ?? "unknown"} |`),
        ].join("\n")
      : "",
    "",
  ].join("\n");
}

async function main() {
  const limit = parseLimit();
  const force = process.argv.includes("--force");
  const refreshMissingLyrics = !process.argv.includes("--skip-lyrics-refresh");

  await mkdir(REPORT_DIR, { recursive: true });

  const queue = await selectCollectorOvernightQueue({
    limit,
    refreshMissingLyrics,
    force,
  });

  console.log(`\nCollector Overnight Batch`);
  console.log(`  Queue: ${queue.length} songs${limit ? ` (limit ${limit})` : ""}`);
  console.log(`  Mode: ${force ? "force re-run" : refreshMissingLyrics ? "new + missing lyrics" : "new packages only"}\n`);

  if (queue.length === 0) {
    console.log("Nothing to process — queue empty.");
    return;
  }

  const progress = emptyCollectorProgress();
  progress.status = "researching";
  progress.startedAt = new Date().toISOString();
  progress.queue = queue.length;
  progress.stageTotal = COLLECTOR_STAGE_TOTAL;
  await saveCollectorProgress(progress);

  const rows: BatchRow[] = [];
  const startedAt = new Date().toISOString();

  for (let i = 0; i < queue.length; i += 1) {
    const song = queue[i]!;
    const remaining = queue.length - i - 1;
    console.log(`[${i + 1}/${queue.length}] ${song.rvtr} — ${song.artist} — ${song.title} (${song.reason})`);

    const live = await loadCollectorProgress();
    live.queue = remaining;
    live.currentSong = { rvtr: song.rvtr, artist: song.artist, title: song.title };
    await saveCollectorProgress(live);

    const t0 = Date.now();
    try {
      const pkg = await runCollectorForSong(song);
      const runtimeMs = Date.now() - t0;
      rows.push({
        rvtr: song.rvtr,
        artist: song.artist,
        title: song.title,
        playCount: song.playCount,
        reason: song.reason,
        status: "completed",
        runtimeMs,
        researchQuality: pkg.researchQuality,
        lyricsAvailable: Boolean(pkg.lyrics?.available),
        lyricsLines: pkg.lyrics?.available ? pkg.lyrics.lineCount : null,
      });
      await recordCollectorCompletion({
        rvtr: pkg.rvtr,
        artist: pkg.artist,
        title: pkg.title,
        researchQuality: pkg.researchQuality,
        runtimeMs,
      });
      console.log(
        `  ✓ ${Math.round(runtimeMs / 1000)}s · quality ${pkg.researchQuality}% · lyrics ${pkg.lyrics?.available ? `${pkg.lyrics.lineCount} lines` : "none"}`,
      );
    } catch (err) {
      const runtimeMs = Date.now() - t0;
      const message = err instanceof Error ? err.message : "collector_failed";
      rows.push({
        rvtr: song.rvtr,
        artist: song.artist,
        title: song.title,
        playCount: song.playCount,
        reason: song.reason,
        status: "failed",
        runtimeMs,
        researchQuality: null,
        lyricsAvailable: false,
        lyricsLines: null,
        error: message,
      });
      console.log(`  ✗ ${message} — continuing`);
    }

    if (remaining > 0) await markCollectorWaiting(remaining);
  }

  await markCollectorIdle();
  const finalProgress = await loadCollectorProgress();
  finalProgress.status = "complete";
  finalProgress.queue = 0;
  await saveCollectorProgress(finalProgress);

  const finishedAt = new Date().toISOString();
  await writeFile(RESULTS_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  await writeFile(REPORT_PATH, buildReport(rows, startedAt, finishedAt), "utf8");

  const done = rows.filter((r) => r.status === "completed").length;
  const lyrics = rows.filter((r) => r.lyricsAvailable).length;
  console.log(`\nDone: ${done}/${rows.length} completed · ${lyrics} with lyrics`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch(async (err) => {
  console.error("[Collector overnight]", err instanceof Error ? err.message : err);
  try {
    const progress = await loadCollectorProgress();
    progress.status = "idle";
    await saveCollectorProgress(progress);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
