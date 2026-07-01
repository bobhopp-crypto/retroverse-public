#!/usr/bin/env node
/**
 * Drain Collector backlog through Editor → Director → Creative Review → Publisher.
 *
 * Usage:
 *   npm run research:studio:collector-backlog
 *   npm run research:studio:collector-backlog -- --limit 100
 *   npm run research:studio:collector-backlog -- --status-only
 *   npm run research:studio:collector-backlog -- --no-resume
 */
require("../finance/preload-server-only.cjs");

import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { buildCollectorBacklogQueue } from "../../lib/ops/studio/production/build-collector-backlog-queue.ts";
import { loadProductionCandidateRows } from "../../lib/ops/studio/production/load-candidate-rows.ts";
import { loadPublisherStore } from "../../lib/ops/studio/publisher/store.ts";
import {
  formatPipelineStageCounts,
  scanPipelineStageCounts,
} from "../../lib/ops/studio/production/scan-pipeline-counts.ts";
import {
  runProductionSong,
  type ProductionSongResult,
} from "../../lib/ops/studio/production/run-song.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio");
const PROGRESS_PATH = join(REPORT_DIR, "collector-backlog-progress.json");
const LOG_PATH = join(REPORT_DIR, "collector-backlog-run.log");
const REPORT_PATH = join(REPORT_DIR, "COLLECTOR_BACKLOG_REPORT.md");

const REPORT_EVERY = 50;

type ProgressFile = {
  startedAt: string;
  updatedAt: string;
  processedRvtrs: string[];
  failedRvtrs: string[];
  results: ProductionSongResult[];
};

function parseLimit(): number {
  const idx = process.argv.indexOf("--limit");
  if (idx >= 0) {
    const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

async function logLine(message: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  process.stdout.write(line);
  await appendFile(LOG_PATH, line, "utf8");
}

async function loadProgress(): Promise<ProgressFile | null> {
  try {
    return JSON.parse(await readFile(PROGRESS_PATH, "utf8")) as ProgressFile;
  } catch {
    return null;
  }
}

async function saveProgress(progress: ProgressFile): Promise<void> {
  progress.updatedAt = new Date().toISOString();
  await writeFile(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
}

async function printStatus(
  publisherByRvtr: Map<string, import("../../lib/ops/studio/publisher/types.ts").PublisherRecord>,
  failedRvtrs: Set<string>,
  label: string,
): Promise<void> {
  const counts = scanPipelineStageCounts(publisherByRvtr, failedRvtrs);
  await logLine(`--- ${label} ---`);
  await logLine(formatPipelineStageCounts(counts));
}

async function main() {
  const limit = parseLimit();
  const resume = !process.argv.includes("--no-resume");
  const statusOnly = process.argv.includes("--status-only");
  const force = process.argv.includes("--force");

  await mkdir(REPORT_DIR, { recursive: true });

  const publisherStore = await loadPublisherStore();
  const publisherByRvtr = new Map(publisherStore.records.map((r) => [r.rvtr, r] as const));

  const prior = resume ? await loadProgress() : null;
  const processedSet = new Set(prior?.processedRvtrs ?? []);
  const failedSet = new Set(prior?.failedRvtrs ?? []);

  await printStatus(publisherByRvtr, failedSet, "Pipeline snapshot (before)");

  if (statusOnly) return;

  const candidateRows = await loadProductionCandidateRows();
  const playCountByRvtr = new Map(candidateRows.map((r) => [r.rvtr, r.playCount] as const));

  const queueBuild = await buildCollectorBacklogQueue({
    limit: limit > 0 ? limit : 0,
    force,
    excludeRvtrs: resume && processedSet.size > 0 ? processedSet : undefined,
    publisherByRvtr,
    playCountByRvtr,
  });

  const queue = queueBuild.items;
  await logLine(
    `Queue built: ${queue.length} songs (collector dirs scanned: ${queueBuild.rowsScanned}, package dirs: ${queueBuild.candidateRowCount})`,
  );

  if (queue.length === 0) {
    await logLine("Nothing to process — backlog drain complete or all excluded by resume set.");
    return;
  }

  const startedAt = prior?.startedAt ?? new Date().toISOString();
  const results: ProductionSongResult[] = [...(prior?.results ?? [])];
  let sinceLastReport = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i]!;
    await logLine(`[${i + 1}/${queue.length}] ${item.rvtr} — ${item.artist} — ${item.title} (${item.reason})`);

    const result = await runProductionSong({
      item,
      skipCollector: true,
    });

    results.push(result);
    processedSet.add(item.rvtr);
    if (result.status === "failed") {
      failedSet.add(item.rvtr);
      await logLine(`  FAILED · ${result.error ?? "unknown"}`);
    } else {
      await logLine(
        `  → ${result.status} · ${Math.round(result.runtimeMs / 1000)}s · editor ${result.stages.editor} · director ${result.stages.director} · creative ${result.stages.creativeReview} · publisher ${result.stages.publisher}`,
      );
    }

    await saveProgress({
      startedAt,
      updatedAt: new Date().toISOString(),
      processedRvtrs: [...processedSet],
      failedRvtrs: [...failedSet],
      results,
    });

    sinceLastReport += 1;
    if (sinceLastReport >= REPORT_EVERY || i === queue.length - 1) {
      sinceLastReport = 0;
      await printStatus(publisherByRvtr, failedSet, `Progress after ${processedSet.size} processed`);
    }
  }

  const batch = results.slice(-queue.length);
  const published = batch.filter((r) => r.status === "published").length;
  const partial = batch.filter((r) => r.status === "partial").length;
  const failed = batch.filter((r) => r.status === "failed").length;

  const report = [
    "# Collector Backlog Production Run",
    "",
    `Started: ${startedAt}`,
    `Finished: ${new Date().toISOString()}`,
    "",
    "## Batch summary",
    "",
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| Processed this run | ${batch.length} |`,
    `| Published | ${published} |`,
    `| Partial | ${partial} |`,
    `| Failed | ${failed} |`,
    "",
    "## Final pipeline counts",
    "",
    formatPipelineStageCounts(scanPipelineStageCounts(publisherByRvtr, failedSet)),
    "",
    failed > 0
      ? [
          "## Failures (this run)",
          "",
          ...batch
            .filter((r) => r.status === "failed")
            .map((r) => `- **${r.rvtr}** — ${r.error ?? "unknown"}`),
        ].join("\n")
      : "",
    "",
  ].join("\n");

  await writeFile(REPORT_PATH, report, "utf8");
  await logLine(`Report: ${REPORT_PATH}`);
  await printStatus(publisherByRvtr, failedSet, "Pipeline snapshot (after)");
}

main().catch(async (err) => {
  const message = err instanceof Error ? err.message : String(err);
  await logLine(`FATAL: ${message}`).catch(() => {});
  console.error("[collector-backlog]", message);
  process.exit(1);
});
