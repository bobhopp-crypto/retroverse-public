#!/usr/bin/env node
/**
 * Sprint 3.19 — batch production for live-testing eras (1980s, 1990s, 2000s).
 *
 * Usage:
 *   npm run research:studio:year-batch
 *   npm run research:studio:year-batch -- --limit 5
 *   npm run research:studio:year-batch -- --eras 1980,1990,2005 --limit-per-era 10
 */
require("../finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildPipelineHealthSnapshot,
  formatPipelineHealthSnapshot,
} from "../../lib/ops/studio/pipeline-snapshot.ts";
import {
  countCandidatesByEra,
  eraAnchorForYear,
  filterCandidateRowsByEras,
  resolveSongYear,
  type StudioEraAnchor,
} from "../../lib/ops/studio/production/filter-by-era.ts";
import { loadProductionCandidateRows } from "../../lib/ops/studio/production/load-candidate-rows.ts";
import { loadPublisherStore } from "../../lib/ops/studio/publisher/store.ts";
import { buildProductionQueue } from "../../lib/ops/studio/production/queue.ts";
import {
  runProductionSong,
  type ProductionSongResult,
} from "../../lib/ops/studio/production/run-song.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio");
const REPORT_PATH = join(REPORT_DIR, "YEAR_BATCH_REPORT.md");
const PROGRESS_PATH = join(REPORT_DIR, "year-batch-progress.json");

type ProgressFile = {
  startedAt: string;
  updatedAt: string;
  eras: StudioEraAnchor[];
  completedRvtrs: string[];
  results: ProductionSongResult[];
};

const DEFAULT_ERAS: StudioEraAnchor[] = [1980, 1990, 2005];

function parseEras(): StudioEraAnchor[] {
  const idx = process.argv.indexOf("--eras");
  if (idx < 0) return DEFAULT_ERAS;
  const raw = process.argv[idx + 1] ?? "";
  const parsed = raw
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n): n is StudioEraAnchor => n === 1980 || n === 1990 || n === 2005);
  return parsed.length > 0 ? parsed : DEFAULT_ERAS;
}

function parseLimitPerEra(): number {
  const idx = process.argv.indexOf("--limit-per-era");
  if (idx >= 0) {
    const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const idx2 = process.argv.indexOf("--limit");
  if (idx2 >= 0) {
    const n = Number.parseInt(process.argv[idx2 + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 15;
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

function selectBalancedEligible<T extends { rvtr: string }>(
  items: T[],
  rowByRvtr: Map<string, { year: number | null; filePath: string }>,
  eras: StudioEraAnchor[],
  limitPerEra: number,
  exclude: Set<string>,
): T[] {
  const buckets = new Map<StudioEraAnchor, T[]>();
  for (const era of eras) buckets.set(era, []);

  for (const item of items) {
    if (exclude.has(item.rvtr)) continue;
    const row = rowByRvtr.get(item.rvtr);
    const era = eraAnchorForYear(
      row ? resolveSongYear({ year: row.year, filePath: row.filePath }) : null,
    );
    if (!era || !buckets.has(era)) continue;
    const bucket = buckets.get(era)!;
    if (bucket.length < limitPerEra) bucket.push(item);
  }

  return eras.flatMap((era) => buckets.get(era) ?? []);
}

async function main() {
  const eras = parseEras();
  const limitPerEra = parseLimitPerEra();
  const resume = !process.argv.includes("--no-resume");
  const refreshCollector = process.argv.includes("--refresh-collector");

  await mkdir(REPORT_DIR, { recursive: true });

  const prior = resume ? await loadProgress() : null;
  const completedSet = new Set(prior?.completedRvtrs ?? []);

  const [candidateRows, publisherStore] = await Promise.all([
    loadProductionCandidateRows(),
    loadPublisherStore(),
  ]);
  const publisherByRvtr = new Map(publisherStore.records.map((r) => [r.rvtr, r] as const));

  const eraCounts = countCandidatesByEra(candidateRows);
  const eraFiltered = filterCandidateRowsByEras(candidateRows, eras);
  const rowByRvtr = new Map(eraFiltered.map((r) => [r.rvtr, r] as const));

  console.log(`\nBuilding eligible queue from ${eraFiltered.length} era-matched candidates…`);
  const eligibleBuild = await buildProductionQueue({
    limit: 0,
    skipCollector: true,
    force: false,
    excludeRvtrs: completedSet,
    publisherByRvtr,
    candidateRows: eraFiltered,
  });

  const queue = selectBalancedEligible(
    eligibleBuild.items,
    rowByRvtr,
    eras,
    limitPerEra,
    completedSet,
  );

  console.log(`\nStudio Year Batch — live testing cohorts`);
  console.log(`  Eras: ${eras.join(", ")} (1980s / 1990s / 2000s)`);
  console.log(`  VDJ candidates by era: 1980=${eraCounts[1980]} · 1990=${eraCounts[1990]} · 2005=${eraCounts[2005]}`);
  console.log(`  Pipeline-eligible in eras: ${eligibleBuild.items.length}`);
  console.log(`  Selected this run: ${queue.length} (up to ${limitPerEra} per era)\n`);

  if (queue.length === 0) {
    console.log("Nothing to process — all era candidates complete or excluded.");
    return;
  }

  const before = formatPipelineHealthSnapshot(await buildPipelineHealthSnapshot());
  const startedAt = prior?.startedAt ?? new Date().toISOString();
  const results: ProductionSongResult[] = [...(prior?.results ?? [])];

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i]!;
    const songYear = resolveSongYear(rowByRvtr.get(item.rvtr) ?? { year: null, filePath: item.filePath ?? "" });
    const era = eraAnchorForYear(songYear);
    console.log(
      `[${i + 1}/${queue.length}] ${item.rvtr} — ${item.artist} — ${item.title} (era ${era ?? "?"} · ${songYear ?? "?"})`,
    );

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
      eras,
      completedRvtrs: [...completedSet],
      results,
    });

    console.log(
      `  → ${result.status} · ${Math.round(result.runtimeMs / 1000)}s · director ${result.stages.director} · publisher ${result.stages.publisher}${result.error ? ` · ${result.error}` : ""}`,
    );
  }

  const batchResults = results.slice(-queue.length);
  const published = batchResults.filter((r) => r.status === "published");
  const partial = batchResults.filter((r) => r.status === "partial");
  const failed = batchResults.filter((r) => r.status === "failed");

  const report = [
    "# Studio Year Batch Report",
    "",
    `Started: ${startedAt}`,
    `Finished: ${new Date().toISOString()}`,
    "",
    "## Target eras",
    "",
    "| Era anchor | Decade | Limit per era |",
    "| --- | --- | ---: |",
    "| 1980 | 1980–1989 |",
    "| 1990 | 1990–1999 |",
    "| 2005 | 2000–2009 |",
    "",
    `Limit per era this run: **${limitPerEra}**`,
    "",
    "## VDJ library era counts",
    "",
    `| Era | Candidates |`,
    `| --- | ---: |`,
    `| 1980 | ${eraCounts[1980]} |`,
    `| 1990 | ${eraCounts[1990]} |`,
    `| 2005 | ${eraCounts[2005]} |`,
    "",
    "## Run summary",
    "",
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| Attempted | ${batchResults.length} |`,
    `| Published | ${published.length} |`,
    `| Partial | ${partial.length} |`,
    `| Failed | ${failed.length} |`,
    "",
    "## Results",
    "",
    "| Song | RVTR | Status |",
    "| --- | --- | --- |",
    ...batchResults.map((r) => `| ${r.title} | ${r.rvtr} | ${r.status} |`),
    "",
    "## Pipeline before",
    "",
    before,
    "",
  ].join("\n");

  await writeFile(REPORT_PATH, report, "utf8");
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Progress: ${PROGRESS_PATH}`);
}

main().catch((err) => {
  console.error("[studio year batch]", err instanceof Error ? err.message : err);
  process.exit(1);
});
