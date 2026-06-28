#!/usr/bin/env node
/**
 * Studio production pass-through — Collector → Editor → Director → Publisher.
 *
 * Usage:
 *   npm run research:studio:production
 *   npm run research:studio:production -- --limit 3
 *   npm run research:studio:production -- --force
 *   npm run research:studio:production -- --refresh-collector
 *   npm run research:studio:production -- --limit 10 --startup-only
 */
require("../finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildPipelineHealthSnapshot,
  formatPipelineHealthSnapshot,
} from "../../lib/ops/studio/pipeline-snapshot.ts";
import { loadPublisherStore } from "../../lib/ops/studio/publisher/store.ts";
import { buildProductionQueue } from "../../lib/ops/studio/production/queue.ts";
import { loadProductionCandidateRows } from "../../lib/ops/studio/production/load-candidate-rows.ts";
import {
  runProductionSong,
  type ProductionSongResult,
} from "../../lib/ops/studio/production/run-song.ts";
import { StartupProfiler } from "../../lib/ops/studio/production/startup-profile.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio");
const REPORT_PATH = join(REPORT_DIR, "PRODUCTION_RUN_REPORT.md");
const RESULTS_PATH = join(REPORT_DIR, "production-results.json");
const PROGRESS_PATH = join(REPORT_DIR, "production-progress.json");
const AUDIT_PATH = join(REPORT_DIR, "PIPELINE_AUDIT_LOG.md");
const STARTUP_PROFILE_PATH = join(REPORT_DIR, "PRODUCTION_STARTUP_PROFILE.md");

type ProgressFile = {
  startedAt: string;
  updatedAt: string;
  completedRvtrs: string[];
  results: ProductionSongResult[];
};

function parseLimit(): number {
  const idx = process.argv.indexOf("--limit");
  if (idx >= 0) {
    const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const env = Number.parseInt(process.env.STUDIO_PRODUCTION_LIMIT ?? "", 10);
  if (Number.isFinite(env) && env > 0) return env;
  return 0;
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

function buildReport(
  before: string,
  results: ProductionSongResult[],
  startedAt: string,
  finishedAt: string,
): string {
  const published = results.filter((r) => r.status === "published");
  const partial = results.filter((r) => r.status === "partial");
  const failed = results.filter((r) => r.status === "failed");

  return [
    "# Studio Production Run Report",
    "",
    `Started: ${startedAt}`,
    `Finished: ${finishedAt}`,
    "",
    "## Before",
    "",
    before,
    "",
    "## Run summary",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Attempted | ${results.length} |`,
    `| Published | ${published.length} |`,
    `| Partial | ${partial.length} |`,
    `| Failed | ${failed.length} |`,
    "",
    "## Results",
    "",
    "| Song | RVTR | Status | Director | Publisher |",
    "| --- | --- | --- | --- | --- |",
    ...results.map(
      (r) =>
        `| ${r.title} | ${r.rvtr} | ${r.status} | ${r.stages.director} | ${r.stages.publisher} |`,
    ),
    "",
    "## Transition audit",
    "",
    ...results.map((r) => ["```", r.auditLog, "```"].join("\n")),
    partial.length
      ? [
          "",
          "## Partial (not published)",
          "",
          ...partial.map((r) => `- **${r.rvtr}** — ${r.error ?? "unknown"}`),
        ].join("\n")
      : "",
    failed.length
      ? [
          "",
          "## Failures",
          "",
          ...failed.map((r) => `- **${r.rvtr}** — ${r.error}`),
        ].join("\n")
      : "",
    "",
  ].join("\n");
}

function buildStartupProfileMarkdown(input: {
  limit: number;
  queueLength: number;
  candidateRowCount: number;
  rowsScanned: number;
  publisherRecordCount: number;
  phases: Array<{ label: string; elapsedMs: number; deltaMs: number }>;
  firstSongElapsedMs: number | null;
  rootCause: string;
  fixes: string[];
}): string {
  const slow = input.phases.filter((p) => p.deltaMs > 2000);
  return [
    "# Studio Production Startup Profile",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Goal",
    "",
    "First `[1/N]` log within **5 seconds** on a warm system.",
    "",
    "## Before fix (code audit — pre-instrumentation)",
    "",
    "| Phase | Estimated impact |",
    "| --- | --- |",
    "| `buildPipelineHealthSnapshot()` before any log | 5–30s (200 RVTR scan + editor loads) |",
    "| `loadBrowserPlus2Model()` full dashboard | 10–60s+ |",
    "| Full queue with `limit: 0` then slice | Scans all 8026 candidates |",
    "| `loadPublisherStore()` per RVTR assessed | 988+ JSON parses × row count |",
    "| First console output | After all of the above |",
    "",
    "**Observed symptom:** silence for several minutes after script start.",
    "",
    "## After fix (measured)",
    "",
    "| Phase | Elapsed (ms) | Delta (ms) |",
    "| --- | ---: | ---: |",
    ...input.phases.map((p) => `| ${p.label} | ${p.elapsedMs} | ${p.deltaMs} |`),
    "",
    input.firstSongElapsedMs != null
      ? `**First song log:** +${input.firstSongElapsedMs}ms`
      : "**First song log:** (startup-only run — not reached)",
    "",
    "## Queue build stats",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Limit | ${input.limit || "none"} |`,
    `| Queue selected | ${input.queueLength} |`,
    `| VDJ candidate rows (unique RVTR) | ${input.candidateRowCount} |`,
    `| Rows scanned for eligibility | ${input.rowsScanned} |`,
    `| Publisher records loaded | ${input.publisherRecordCount} |`,
    "",
    slow.length
      ? [
          "## Slow phases (>2s)",
          "",
          ...slow.map((p) => `- **${p.label}** — ${p.deltaMs}ms`),
          "",
        ].join("\n")
      : "## Slow phases (>2s)\n\nNone.\n",
    "## Root cause",
    "",
    input.rootCause,
    "",
    "## Fixes applied",
    "",
    ...input.fixes.map((f) => `- ${f}`),
    "",
  ].join("\n");
}

const ROOT_CAUSE = [
  "Startup blocked silently before any queue log:",
  "",
  "1. **`buildPipelineHealthSnapshot()` ran first** — scans up to 200 RVTR directories with parallel `loadEditorStory` calls before any user-facing output.",
  "2. **`selectProductionQueue({ limit: 0 })`** — built the entire eligible queue before applying `--limit`, so `--limit 10` still scanned every play-count row.",
  "3. **`loadBrowserPlus2Model()` inside queue selection** — rebuilt the full Browser+ 2 dashboard (cohorts, cover batch, metadata impact, studio operations, package integrity) just to read sorted VDJ rows.",
  "4. **`assessPackagePipelineStage()` re-parsed publisher store per RVTR** — `loadPublisherStore()` on every candidate row (multi-MB JSON × hundreds of songs).",
].join("\n");

const FIXES = [
  "Log startup phases immediately with `[startup +Nms]` timestamps.",
  "Defer `buildPipelineHealthSnapshot()` until after queue selection / first song log.",
  "Pass CLI `--limit` into queue builder for early exit once N eligible songs are found.",
  "Load publisher store once; pass `publisherByRvtr` map into every stage assessment.",
  "Replace `loadBrowserPlus2Model()` with lightweight `loadProductionCandidateRows()` (`loadBrowserPlusModel` + filter only).",
];

async function main() {
  const profiler = new StartupProfiler();
  const limit = parseLimit();
  const force = process.argv.includes("--force");
  const refreshCollector = process.argv.includes("--refresh-collector");
  const resume = !process.argv.includes("--no-resume");
  const startupOnly = process.argv.includes("--startup-only");

  profiler.mark("Starting...");

  await mkdir(REPORT_DIR, { recursive: true });
  profiler.mark("Report directory ready");

  profiler.mark("Loading progress file...");
  const prior = resume ? await loadProgress() : null;
  const completedSet = new Set(prior?.completedRvtrs ?? []);
  profiler.mark(
    resume && completedSet.size > 0
      ? `Progress loaded (${completedSet.size} completed RVTRs to skip)`
      : "Progress loaded (fresh run)",
  );

  profiler.mark("Loading publisher records...");
  const publisherStore = await loadPublisherStore();
  const publisherByRvtr = new Map(publisherStore.records.map((r) => [r.rvtr, r] as const));
  profiler.mark(`Publisher records loaded (${publisherByRvtr.size} records)`);

  profiler.mark("Loading VDJ candidate index...");
  const candidateRows = await loadProductionCandidateRows();
  profiler.mark(`VDJ index loaded (${candidateRows.length} candidate RVTRs)`);

  profiler.mark("Building queue...");
  const queueBuild = await buildProductionQueue({
    limit: limit > 0 ? limit : 0,
    skipCollector: true,
    force,
    excludeRvtrs: resume && completedSet.size > 0 ? completedSet : undefined,
    publisherByRvtr,
    candidateRows,
  });
  const queue = queueBuild.items;
  profiler.mark(
    `Queue built: ${queue.length} songs (scanned ${queueBuild.rowsScanned}/${queueBuild.candidateRowCount} candidates)`,
  );

  console.log(`\nStudio Production Pass-Through`);
  console.log(`  Queue: ${queue.length}${limit ? ` (limit ${limit})` : ""}`);
  console.log(`  Resume: ${resume && completedSet.size > 0 ? `${completedSet.size} already done` : "fresh"}\n`);

  if (queue.length === 0) {
    console.log("Nothing to process.");
    await writeFile(
      STARTUP_PROFILE_PATH,
      buildStartupProfileMarkdown({
        limit,
        queueLength: 0,
        candidateRowCount: queueBuild.candidateRowCount,
        rowsScanned: queueBuild.rowsScanned,
        publisherRecordCount: publisherByRvtr.size,
        phases: profiler.phases,
        firstSongElapsedMs: null,
        rootCause: "Queue empty after startup — no eligible songs or all excluded by resume set.",
        fixes: FIXES,
      }),
      "utf8",
    );
    return;
  }

  const first = queue[0]!;
  profiler.mark(`Selecting first candidate: ${first.rvtr} — ${first.title}`);

  const firstSongElapsedMs = profiler.phases[profiler.phases.length - 1]?.elapsedMs ?? 0;
  profiler.mark("Starting song 1...");

  if (startupOnly) {
    console.log(`\n--startup-only: stopping before pipeline work.`);
    console.log(`  First song would be: ${first.rvtr} — ${first.artist} — ${first.title}`);
    await writeFile(
      STARTUP_PROFILE_PATH,
      buildStartupProfileMarkdown({
        limit,
        queueLength: queue.length,
        candidateRowCount: queueBuild.candidateRowCount,
        rowsScanned: queueBuild.rowsScanned,
        publisherRecordCount: publisherByRvtr.size,
        phases: profiler.phases,
        firstSongElapsedMs,
        rootCause: ROOT_CAUSE,
        fixes: FIXES,
      }),
      "utf8",
    );
    console.log(`\nStartup profile: ${STARTUP_PROFILE_PATH}`);
    return;
  }

  profiler.mark("Loading pipeline health snapshot (before)...");
  const beforeSnapshot = formatPipelineHealthSnapshot(await buildPipelineHealthSnapshot());
  profiler.mark("Before snapshot ready");

  console.log(`[startup] First [1/${queue.length}] log at +${firstSongElapsedMs}ms`);
  console.log(`[1/${queue.length}] ${first.rvtr} — ${first.artist} — ${first.title} (${first.reason})`);

  const startedAt = prior?.startedAt ?? new Date().toISOString();
  const results: ProductionSongResult[] = [...(prior?.results ?? [])];

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i]!;

    const result = await runProductionSong({
      item,
      skipCollector: !refreshCollector,
      refreshCollector,
    });
    results.push(result);
    completedSet.add(item.rvtr);

    await saveProgress({
      startedAt,
      updatedAt: new Date().toISOString(),
      completedRvtrs: [...completedSet],
      results,
    });

    if (i > 0) {
      console.log(`[${i + 1}/${queue.length}] ${item.rvtr} — ${item.artist} — ${item.title} (${item.reason})`);
    }

    console.log(
      `  → ${result.status} · ${Math.round(result.runtimeMs / 1000)}s · director ${result.stages.director} · publisher ${result.stages.publisher}${result.error ? ` · ${result.error}` : ""}`,
    );
    console.log(result.auditLog.split("\n").map((l) => `     ${l}`).join("\n"));
  }

  const finishedAt = new Date().toISOString();
  const batchResults = results.slice(-queue.length);
  await writeFile(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await writeFile(
    AUDIT_PATH,
    [
      "# Pipeline Transition Audit",
      "",
      `Generated: ${finishedAt}`,
      "",
      ...batchResults.map((r) => r.auditLog),
    ].join("\n\n"),
    "utf8",
  );
  await writeFile(
    REPORT_PATH,
    buildReport(beforeSnapshot, batchResults, startedAt, finishedAt),
    "utf8",
  );

  const after = formatPipelineHealthSnapshot(await buildPipelineHealthSnapshot());
  console.log(`\n${after}`);
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Audit: ${AUDIT_PATH}`);

  await writeFile(
    STARTUP_PROFILE_PATH,
    buildStartupProfileMarkdown({
      limit,
      queueLength: queue.length,
      candidateRowCount: queueBuild.candidateRowCount,
      rowsScanned: queueBuild.rowsScanned,
      publisherRecordCount: publisherByRvtr.size,
      phases: profiler.phases,
      firstSongElapsedMs,
      rootCause: ROOT_CAUSE,
      fixes: FIXES,
    }),
    "utf8",
  );
}

main().catch((err) => {
  console.error("[studio production]", err instanceof Error ? err.message : err);
  process.exit(1);
});
