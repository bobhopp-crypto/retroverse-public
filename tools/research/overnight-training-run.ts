#!/usr/bin/env node
/**
 * Overnight Training Run — 50-song local vs cloud evaluation.
 *
 * Usage:
 *   npm run research:training:overnight              # select + local + cloud + reports
 *   npm run research:training:overnight -- --select    # selection only
 *   npm run research:training:overnight -- --local     # local batch only
 *   npm run research:training:overnight -- --cloud       # cloud batch (reuses collector)
 *   npm run research:training:overnight -- --reports   # regenerate reports from JSON
 */
require("../finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildLocalVsCloudComparison,
  formatBatchReport,
  formatDepartmentHealth,
  formatLocalVsCloudReport,
  formatTrainingSummary,
  summarizeBatch,
} from "../../lib/ops/studio/training-batch/reports.ts";
import { runTrainingSongPipeline } from "../../lib/ops/studio/training-batch/run-song.ts";
import {
  loadSongSelectionFromCsv,
  persistSongSelection,
  selectTrainingBatchSongs,
} from "../../lib/ops/studio/training-batch/select-songs.ts";
import type { BatchRunSummary, SongBatchResult } from "../../lib/ops/studio/training-batch/types.ts";

const REPORT_DIR = join(process.cwd(), "reports/training");
const LOCAL_JSON = join(REPORT_DIR, "local-results.json");
const CLOUD_JSON = join(REPORT_DIR, "cloud-results.json");

const args = new Set(process.argv.slice(2));
const selectOnly = args.has("--select");
const localOnly = args.has("--local");
const cloudOnly = args.has("--cloud");
const reportsOnly = args.has("--reports");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const runAll = !selectOnly && !localOnly && !cloudOnly && !reportsOnly;

async function saveJson(path: string, data: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function runBatch(
  mode: "local" | "cloud",
  songs: Awaited<ReturnType<typeof loadSongSelectionFromCsv>>,
): Promise<BatchRunSummary> {
  const results: SongBatchResult[] = [];
  const skipCollector = mode === "cloud";

  for (let i = 0; i < songs.length; i += 1) {
    const song = songs[i]!;
    console.log(`[${mode}] ${i + 1}/${songs.length} ${song.rvtr} — ${song.artist} — ${song.title}`);
    try {
      const result = await runTrainingSongPipeline({
        song,
        mode,
        skipCollector,
        maxRetries: 1,
      });
      results.push(result);
      console.log(
        `  → ${result.status} · patron ${result.patronValue ?? "—"} · ${Math.round(result.totalRuntimeMs / 1000)}s`,
      );
    } catch (err) {
      console.error(`  → FAILED: ${err instanceof Error ? err.message : err}`);
      results.push({
        rvtr: song.rvtr,
        artist: song.artist,
        title: song.title,
        mode,
        status: "failed",
        error: err instanceof Error ? err.message : "unknown",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        totalRuntimeMs: 0,
        retries: 0,
        collector: { runtimeMs: 0, confidence: null, status: "failed", error: "batch_abort", details: {} },
        editor: { runtimeMs: 0, confidence: null, status: "skipped", error: null, details: {} },
        director: { runtimeMs: 0, confidence: null, status: "skipped", error: null, details: {} },
        publisher: { runtimeMs: 0, confidence: null, status: "skipped", error: null, details: {} },
        renderer: { runtimeMs: 0, confidence: null, status: "skipped", error: null, details: {} },
        patronValue: null,
        sceneCount: null,
        wordsPerScene: null,
        visualCoverage: null,
        packageCompleteness: null,
        coachingNotes: [],
      });
    }
  }

  return summarizeBatch(mode, songs.length, results);
}

async function writeReports(
  selection: Awaited<ReturnType<typeof selectTrainingBatchSongs>>,
  local: BatchRunSummary,
  cloud: BatchRunSummary,
): Promise<void> {
  const cmp = buildLocalVsCloudComparison(local, cloud);
  await Promise.all([
    writeFile(join(REPORT_DIR, "LOCAL_BATCH_REPORT.md"), formatBatchReport(local, "Local Batch Report")),
    writeFile(join(REPORT_DIR, "CLOUD_BATCH_REPORT.md"), formatBatchReport(cloud, "Cloud Batch Report")),
    writeFile(join(REPORT_DIR, "LOCAL_VS_CLOUD.md"), formatLocalVsCloudReport(cmp)),
    writeFile(join(REPORT_DIR, "DEPARTMENT_HEALTH.md"), formatDepartmentHealth(cmp)),
    writeFile(join(REPORT_DIR, "TRAINING_SUMMARY.md"), formatTrainingSummary(selection, cmp)),
  ]);
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  let selection = await selectTrainingBatchSongs().catch(async () => {
    const songs = await loadSongSelectionFromCsv(REPORT_DIR);
    return {
      targetCount: 50,
      selectedCount: songs.length,
      criteria: {
        playCountMin: 10,
        playCountMax: 20,
        requiresVideo: true,
        requiresRvtr: true,
        excludeShowcase: true,
        preferChartHistory: true,
      },
      songs,
      gapNote: null,
    };
  });

  if (runAll || selectOnly || localOnly || cloudOnly) {
    selection = await selectTrainingBatchSongs();
    const csvPath = await persistSongSelection(selection, REPORT_DIR);
    console.log(`Selected ${selection.selectedCount} songs → ${csvPath}`);
    if (selection.gapNote) console.warn(selection.gapNote);
  }

  if (selectOnly) return;

  if (reportsOnly) {
    const local = await loadJson<BatchRunSummary>(LOCAL_JSON);
    const cloud = await loadJson<BatchRunSummary>(CLOUD_JSON);
    if (!local || !cloud) throw new Error("Missing local-results.json or cloud-results.json");
    await writeReports(selection, local, cloud);
    console.log(`Reports written to ${REPORT_DIR}`);
    return;
  }

  const songs =
    selection.songs.length > 0
      ? selection.songs
      : await loadSongSelectionFromCsv(REPORT_DIR);

  const batchSongs = limit && limit > 0 ? songs.slice(0, limit) : songs;
  if (batchSongs.length === 0) throw new Error("No songs selected — check VDJ library and criteria");
  if (limit) console.log(`Limiting batch to ${batchSongs.length} songs (--limit=${limit})`);

  let localSummary: BatchRunSummary;
  let cloudSummary: BatchRunSummary;

  if (runAll || localOnly) {
    console.log("\n=== Batch A — Local ===\n");
    localSummary = await runBatch("local", batchSongs);
    await saveJson(LOCAL_JSON, localSummary);
    await writeFile(
      join(REPORT_DIR, "LOCAL_BATCH_REPORT.md"),
      formatBatchReport(localSummary, "Local Batch Report"),
    );
  } else {
    localSummary = (await loadJson<BatchRunSummary>(LOCAL_JSON)) ?? summarizeBatch("local", songs.length, []);
  }

  if (runAll || cloudOnly) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not set — cloud batch will fall back to rules-based Editor.");
    }
    console.log("\n=== Batch B — Cloud ===\n");
    cloudSummary = await runBatch("cloud", batchSongs);
    await saveJson(CLOUD_JSON, cloudSummary);
    await writeFile(
      join(REPORT_DIR, "CLOUD_BATCH_REPORT.md"),
      formatBatchReport(cloudSummary, "Cloud Batch Report"),
    );
  } else {
    cloudSummary = (await loadJson<BatchRunSummary>(CLOUD_JSON)) ?? summarizeBatch("cloud", songs.length, []);
  }

  if (runAll || localOnly || cloudOnly) {
    await writeReports(selection, localSummary, cloudSummary);
    console.log(`\nDone. Reports: ${REPORT_DIR}`);
    console.log(`Open TRAINING_SUMMARY.md for executive readout.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
