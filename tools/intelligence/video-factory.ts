#!/usr/bin/env npx tsx
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { promisify } from "node:util";

import { loadDeckIndex, saveDeckIndex, type DeckIndex } from "../../lib/ops/intelligence/deck-index.ts";
import { backfillQueuePath, coverRecoveryQueuePath, intelligenceRoot, songPackagesDir } from "../../lib/ops/intelligence/paths.ts";
import { normVdjPath, scanVdjDatabase, vdjDatabasePath } from "../../lib/ops/intelligence/vdj-database.ts";
import { loadAutoRecoveredCovers, saveCoverRecoveryQueue } from "../../lib/ops/intelligence/cover-recovery-store.ts";
import { buildRecoverySummary, recoverCoverForTrack, type CoverRecoveryEntry } from "../../lib/ops/intelligence/cover-recovery-queue.ts";
import type { TopPlayedTrack } from "../../lib/ops/intelligence/top-played-backfill.ts";
import { loadVdjIdentityCoverage } from "../../lib/ops/intelligence/vdj-identity-coverage.ts";
import { runProductionPipeline } from "../../lib/ops/intelligence/production-pipeline.ts";
import { loadPerformanceDeck } from "../../lib/ops/intelligence/load-performance-deck.ts";

const execFileAsync = promisify(execFile);
const VIDEO_EXTENSIONS = new Set([".mp4", ".m4v", ".mov", ".avi", ".mkv", ".mpg", ".mpeg", ".vob", ".wmv"]);
const LOOP_SLEEP_MS = Number(process.env.VIDEO_FACTORY_LOOP_SLEEP_MS ?? "30000") || 30000;
const PACKAGE_BATCH_SIZE = Number(process.env.VIDEO_FACTORY_PACKAGE_BATCH_SIZE ?? "1") || 1;
const DECK_BATCH_SIZE = Number(process.env.VIDEO_FACTORY_DECK_BATCH_SIZE ?? "25") || 25;

type VideoFactoryState = {
  matched: boolean;
  package: boolean;
  deck: boolean;
  cover: boolean;
  thumbnail: boolean;
};

type VideoFactoryWorker =
  | "rvtr-label-matcher"
  | "cover-recovery"
  | "package-backfill"
  | "deck-generation"
  | "thumbnail-generation"
  | "complete";

type VideoFactoryItem = {
  rvtr: string;
  title: string;
  artist: string;
  videoFiles: string[];
  state: VideoFactoryState;
  nextWorker: VideoFactoryWorker;
  updatedAt: string;
};

type VideoFactoryQueue = {
  version: 1;
  scope: "VIDEO";
  updatedAt: string;
  sources: {
    vdjDatabasePath: string;
    packageStorePath: string;
    deckIndexPath: string;
    backfillQueuePath: string;
    coverRecoveryQueuePath: string;
  };
  counts: {
    complete: number;
    missingPackage: number;
    missingDeck: number;
    missingCover: number;
    missingThumbnail: number;
    unmatchedVideoRows: number;
    matchableUnmatchedVideoRows: number;
    uniqueVideoRvtrs: number;
    videoRows: number;
  };
  unmatchedVideoRows: Array<{
    title: string;
    artist: string;
    filePath: string;
    updatedAt: string;
  }>;
  items: VideoFactoryItem[];
};

type PackageSummary = {
  status: string;
  coverUrl: string | null;
};

type XmlSongMeta = {
  label: string;
  hasVdjCover: boolean;
};

function queuePath(): string {
  return join(intelligenceRoot(), "video-work-queue.json");
}

function liveSongPackageExists(rvtr: string): boolean {
  return existsSync(join(songPackagesDir(), `${rvtr}.json`));
}

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readAttr(block: string, name: string): string {
  const match = block.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match?.[1] ? decodeXmlAttr(match[1]) : "";
}

function rvtrFromLabel(label: string): string | null {
  return label.match(/RVTR\d{6}/i)?.[0]?.toUpperCase() ?? null;
}

function isVideoFile(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(extname(filePath.split("?")[0] ?? "").toLowerCase());
}

function isFactoryVideoPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return isVideoFile(normalized) && /\/VIDEO\//i.test(normalized) && !/\/VIDEO VAULT\//i.test(normalized);
}

function withoutExtension(filePath: string): string {
  const ext = extname(filePath);
  return ext ? filePath.slice(0, -ext.length) : filePath;
}

function findSidecarThumbnail(filePath: string): string | null {
  const base = withoutExtension(filePath);
  const candidates = [
    `${base}.jpg`,
    `${filePath}.jpg`,
    `${base}.jpeg`,
    `${filePath}.jpeg`,
    `${base}.png`,
    `${filePath}.png`,
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function loadPackageSummaries(): Promise<Map<string, PackageSummary>> {
  const out = new Map<string, PackageSummary>();
  try {
    const files = await readdir(songPackagesDir());
    for (const file of files) {
      if (!/^RVTR\d{6}\.json$/i.test(file)) continue;
      try {
        const raw = await readFile(join(songPackagesDir(), file), "utf8");
        const parsed = JSON.parse(raw) as {
          rvtr?: string;
          status?: string;
          metadata?: { coverUrl?: string | null };
        };
        const rvtr = (parsed.rvtr ?? basename(file, ".json")).trim().toUpperCase();
        if (!/^RVTR\d{6}$/.test(rvtr)) continue;
        out.set(rvtr, {
          status: parsed.status ?? "draft",
          coverUrl: parsed.metadata?.coverUrl ?? null,
        });
      } catch {
        // Ignore malformed package files; the queue reports absence via package=false.
      }
    }
  } catch {
    // Missing package store means every VIDEO RVTR is missing package.
  }
  return out;
}

async function loadXmlSongMetaByPath(): Promise<Map<string, XmlSongMeta>> {
  const xml = await readFile(vdjDatabasePath(), "utf8");
  const out = new Map<string, XmlSongMeta>();
  for (const match of xml.matchAll(/<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g)) {
    const filePath = decodeXmlAttr(match[1] ?? "").replace(/\\/g, "/");
    const inner = match[2] ?? "";
    const tagsAttrs = inner.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
    const infosAttrs = inner.match(/<Infos([^>]*)\/?>/)?.[1] ?? "";
    out.set(normVdjPath(filePath), {
      label: readAttr(tagsAttrs, "Label").trim(),
      hasVdjCover: Boolean(readAttr(infosAttrs, "Cover")) || /<Link\b[^>]*\sCover="/.test(inner),
    });
  }
  return out;
}

function nextWorkerFor(state: VideoFactoryState): VideoFactoryWorker {
  if (!state.matched) return "rvtr-label-matcher";
  if (!state.cover) return "cover-recovery";
  if (!state.package) return "package-backfill";
  if (!state.deck) return "deck-generation";
  if (!state.thumbnail) return "thumbnail-generation";
  return "complete";
}

function countsFor(items: VideoFactoryItem[], unmatchedVideoRows: number, matchableUnmatchedVideoRows: number, videoRows: number) {
  return {
    complete: items.filter((item) => item.state.package && item.state.deck && item.state.cover && item.state.thumbnail).length,
    missingPackage: items.filter((item) => !item.state.package).length,
    missingDeck: items.filter((item) => item.state.package && !item.state.deck).length,
    missingCover: items.filter((item) => !item.state.cover).length,
    missingThumbnail: items.filter((item) => !item.state.thumbnail).length,
    unmatchedVideoRows,
    matchableUnmatchedVideoRows,
    uniqueVideoRvtrs: items.length,
    videoRows,
  };
}

export async function refreshVideoFactoryQueue(): Promise<VideoFactoryQueue> {
  const now = new Date().toISOString();
  const [scan, packages, deckIndex, xmlMetaByPath, coverage, recoveredCovers] = await Promise.all([
    scanVdjDatabase({ force: true }),
    loadPackageSummaries(),
    loadDeckIndex(),
    loadXmlSongMetaByPath(),
    loadVdjIdentityCoverage({ force: true }),
    loadAutoRecoveredCovers(),
  ]);
  const deckRvtrs = new Set(deckIndex.decks.map((entry) => entry.rvtr));
  const identityByPath = new Map(coverage.matches.map((match) => [match.entry.filePathNorm, match.rvtr]));
  const byRvtr = new Map<
    string,
    {
      title: string;
      artist: string;
      videoFiles: string[];
      hasCover: boolean;
      hasAllThumbnails: boolean;
      hasDkLabel: boolean;
    }
  >();
  const unmatchedVideoRows: VideoFactoryQueue["unmatchedVideoRows"] = [];
  let matchableUnmatchedVideoRows = 0;
  let videoRows = 0;

  for (const entry of scan.entries) {
    if (!isFactoryVideoPath(entry.filePath)) continue;
    videoRows += 1;

    const xmlMeta = xmlMetaByPath.get(entry.filePathNorm) ?? { label: "", hasVdjCover: false };
    const label = xmlMeta.label;
    const rvtr = rvtrFromLabel(label);

    if (!rvtr) {
      if (identityByPath.has(entry.filePathNorm)) matchableUnmatchedVideoRows += 1;
      unmatchedVideoRows.push({
        title: entry.title,
        artist: entry.artist,
        filePath: entry.filePath,
        updatedAt: now,
      });
      continue;
    }

    const current = byRvtr.get(rvtr) ?? {
      title: entry.title,
      artist: entry.artist,
      videoFiles: [],
      hasCover: false,
      hasAllThumbnails: true,
      hasDkLabel: false,
    };

    current.videoFiles.push(entry.filePath);
    current.hasCover ||= xmlMeta.hasVdjCover;
    current.hasAllThumbnails &&= Boolean(findSidecarThumbnail(entry.filePath));
    current.hasDkLabel ||= label.startsWith("DK_");
    byRvtr.set(rvtr, current);
  }

  const items: VideoFactoryItem[] = [...byRvtr.entries()]
    .map(([rvtr, row]) => {
      const pkg = packages.get(rvtr) ?? null;
      const state: VideoFactoryState = {
        matched: true,
        package: Boolean(pkg),
        deck: deckRvtrs.has(rvtr) || row.hasDkLabel,
        cover: row.hasCover || Boolean(pkg?.coverUrl) || recoveredCovers.has(rvtr),
        thumbnail: row.hasAllThumbnails,
      };
      return {
        rvtr,
        title: row.title,
        artist: row.artist,
        videoFiles: [...new Set(row.videoFiles)].sort(),
        state,
        nextWorker: nextWorkerFor(state),
        updatedAt: now,
      };
    })
    .sort((a, b) => a.nextWorker.localeCompare(b.nextWorker) || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));

  const queue: VideoFactoryQueue = {
    version: 1,
    scope: "VIDEO",
    updatedAt: now,
    sources: {
      vdjDatabasePath: vdjDatabasePath(),
      packageStorePath: songPackagesDir(),
      deckIndexPath: join(process.cwd(), "data", "ops", "intelligence", "deck-index.json"),
      backfillQueuePath: backfillQueuePath(),
      coverRecoveryQueuePath: coverRecoveryQueuePath(),
    },
    counts: countsFor(items, unmatchedVideoRows.length, matchableUnmatchedVideoRows, videoRows),
    unmatchedVideoRows,
    items,
  };

  await mkdir(dirname(queuePath()), { recursive: true });
  await writeFile(queuePath(), `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  printCounts(queue, "VIDEO factory queue refreshed");
  console.log(`Queue: ${queuePath()}`);
  console.log(`Wrote: ${queuePath()}`);
  return queue;
}

function printCounts(queue: VideoFactoryQueue, label: string): void {
  console.log(`\n${label}`);
  console.log(`Complete:           ${queue.counts.complete}`);
  console.log(`Missing package:    ${queue.counts.missingPackage}`);
  console.log(`Missing deck:       ${queue.counts.missingDeck}`);
  console.log(`Missing cover:      ${queue.counts.missingCover}`);
  console.log(`Missing thumbnail:  ${queue.counts.missingThumbnail}`);
  console.log(`Unmatched VIDEO:    ${queue.counts.unmatchedVideoRows}`);
  console.log(`Matchable unmatched:${queue.counts.matchableUnmatchedVideoRows}`);
}

async function runLabelMatcher(): Promise<string> {
  const { stdout, stderr } = await execFileAsync("npx", ["--yes", "tsx", "tools/intelligence/label-vdj-packages.ts"], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 20,
  });
  const text = `${stdout}\n${stderr}`.trim();
  try {
    const parsed = JSON.parse(stdout) as { backupPath?: string; vdjDatabasePath?: string; reportPath?: string };
    return `rvtr-label-matcher ran. Touched: ${parsed.vdjDatabasePath ?? vdjDatabasePath()}. Backup: ${parsed.backupPath ?? "unknown"}. Report: ${parsed.reportPath ?? "reports/intelligence/vdj-package-label-report.json"}`;
  } catch {
    return `rvtr-label-matcher ran. Touched: ${vdjDatabasePath()}. Output: ${text.slice(0, 1000)}`;
  }
}

async function checkLabelMatcherNeeded(): Promise<{ needed: boolean; summary: string }> {
  const { stdout, stderr } = await execFileAsync("npx", ["--yes", "tsx", "tools/intelligence/label-vdj-packages.ts", "--check"], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 20,
  });
  const text = `${stdout}\n${stderr}`.trim();
  try {
    const parsed = JSON.parse(stdout) as {
      wouldChange?: boolean;
      labelUpdatesApplied?: number;
      pkCount?: number;
      dkCount?: number;
      rvtrOnlyCount?: number;
      reportPath?: string;
    };
    return {
      needed: Boolean(parsed.wouldChange),
      summary: `label-refresh-check: wouldChange=${Boolean(parsed.wouldChange)}, updates=${parsed.labelUpdatesApplied ?? 0}, RVTR=${parsed.rvtrOnlyCount ?? 0}, PK=${parsed.pkCount ?? 0}, DK=${parsed.dkCount ?? 0}. Report: ${parsed.reportPath ?? "reports/intelligence/vdj-package-label-report.json"}`,
    };
  } catch {
    return {
      needed: false,
      summary: `label-refresh-check failed to parse output: ${text.slice(0, 1000)}`,
    };
  }
}

function queueItemToCoverTrack(item: VideoFactoryItem): TopPlayedTrack {
  return {
    rvtr: item.rvtr,
    title: item.title,
    artist: item.artist,
    playCount: 0,
    filePath: item.videoFiles[0] ?? "",
    identifiable: true,
    hasCover: false,
    coverSource: null,
    hasPackage: item.state.package,
    artifactsReady: false,
    retroverseReady: false,
    confidence: 0,
    runtimeMs: null,
    status: null,
  };
}

async function runVideoCoverRecoveryBatch(queue: VideoFactoryQueue): Promise<{
  attempted: number;
  recovered: number;
  review: number;
  failed: number;
}> {
  const missingCover = queue.items.filter((item) => !item.state.cover);
  const entries: CoverRecoveryEntry[] = [];

  for (let i = 0; i < missingCover.length; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 300));
    entries.push(await recoverCoverForTrack(queueItemToCoverTrack(missingCover[i]!)));
  }

  const summary = buildRecoverySummary(entries);
  await saveCoverRecoveryQueue({
    version: 1,
    scope: "video-factory",
    updatedAt: new Date().toISOString(),
    entries,
    summary,
  });

  return {
    attempted: summary.total,
    recovered: summary.recovered,
    review: summary.reviewNeeded,
    failed: summary.failed,
  };
}

async function runVideoPackageBatch(queue: VideoFactoryQueue): Promise<{
  attempted: number;
  generated: number;
  skipped_existing: number;
  review: number;
  failed: number;
  runtimeMs: number;
  batchSize: number;
}> {
  const batch = queue.items
    .filter((item) => item.state.matched && !item.state.package)
    .slice(0, Math.max(1, PACKAGE_BATCH_SIZE));
  const startedAt = Date.now();
  const summary = {
    attempted: batch.length,
    generated: 0,
    skipped_existing: 0,
    review: 0,
    failed: 0,
    runtimeMs: 0,
    batchSize: Math.max(1, PACKAGE_BATCH_SIZE),
  };

  for (const item of batch) {
    if (liveSongPackageExists(item.rvtr)) {
      summary.skipped_existing += 1;
      continue;
    }

    try {
      console.log(`Package worker: ${item.rvtr} · ${item.artist} — ${item.title}`);
      const outcome = await runProductionPipeline(item.rvtr);
      if (outcome.ok && outcome.published) {
        summary.generated += 1;
      } else if (outcome.ok && outcome.publishBlocked) {
        summary.review += 1;
      } else {
        summary.failed += 1;
      }
    } catch (err) {
      summary.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`Package worker failed: ${item.rvtr} · ${message}`);
    }
  }

  summary.runtimeMs = Date.now() - startedAt;
  return summary;
}

async function runVideoDeckBatch(queue: VideoFactoryQueue): Promise<{
  attempted: number;
  promoted: number;
  generated: number;
  skipped_existing: number;
  failed: number;
  runtimeMs: number;
  batchSize: number;
}> {
  const batch = queue.items
    .filter((item) => item.state.matched && item.state.package && !item.state.deck)
    .slice(0, Math.max(1, DECK_BATCH_SIZE));
  const startedAt = Date.now();
  const summary = {
    attempted: batch.length,
    promoted: 0,
    generated: 0,
    skipped_existing: 0,
    failed: 0,
    runtimeMs: 0,
    batchSize: Math.max(1, DECK_BATCH_SIZE),
  };
  const index = await loadDeckIndex();
  const existing = new Set(index.decks.map((entry) => entry.rvtr));
  const promoted = new Set<string>();

  for (const item of batch) {
    if (existing.has(item.rvtr)) {
      summary.skipped_existing += 1;
      continue;
    }

    const deck = await loadPerformanceDeck(item.rvtr);
    if (deck) {
      promoted.add(item.rvtr);
      summary.promoted += 1;
      continue;
    }

    // No standalone deck generator exists yet; only promote renderable package assets.
    summary.failed += 1;
  }

  if (promoted.size > 0) {
    const next: DeckIndex = {
      version: 1,
      updatedAt: new Date().toISOString(),
      decks: [...index.decks, ...[...promoted].map((rvtr) => ({ rvtr }))],
    };
    await saveDeckIndex(next);
  }

  summary.runtimeMs = Date.now() - startedAt;
  return summary;
}

async function runOnce(): Promise<void> {
  const initial = await refreshVideoFactoryQueue();
  let current = initial;
  const details: string[] = [];
  const skipped: string[] = [];

  const labelCheck = await checkLabelMatcherNeeded();
  if (current.counts.matchableUnmatchedVideoRows > 0 || labelCheck.needed) {
    details.push(labelCheck.summary);
    details.push(`rvtr-label-matcher: ${await runLabelMatcher()}`);
    current = await refreshVideoFactoryQueue();
  } else {
    if (current.counts.unmatchedVideoRows > 0) {
      skipped.push("rvtr-label-matcher skipped: remaining unmatched VIDEO rows have no identity coverage for the existing label matcher");
    }
  }

  if (current.counts.missingCover > 0) {
    const cover = await runVideoCoverRecoveryBatch(current);
    details.push(`cover-recovery: attempted=${cover.attempted}, recovered=${cover.recovered}, review=${cover.review}, failed=${cover.failed}. Touched: ${coverRecoveryQueuePath()}`);
    current = await refreshVideoFactoryQueue();
  }

  if (current.counts.missingPackage > 0) {
    const beforeMissingPackage = current.counts.missingPackage;
    const packages = await runVideoPackageBatch(current);
    current = await refreshVideoFactoryQueue();
    details.push(
      `package-worker: attempted=${packages.attempted}, generated=${packages.generated}, skipped_existing=${packages.skipped_existing}, review=${packages.review}, failed=${packages.failed}, runtime=${Math.round(packages.runtimeMs / 1000)}s, batch_size=${packages.batchSize}. Missing package before=${beforeMissingPackage}, after=${current.counts.missingPackage}.`,
    );
  }

  if (current.counts.missingDeck > 0) {
    const beforeMissingDeck = current.counts.missingDeck;
    const decks = await runVideoDeckBatch(current);
    current = await refreshVideoFactoryQueue();
    details.push(
      `deck-worker: attempted=${decks.attempted}, promoted=${decks.promoted}, generated=${decks.generated}, skipped_existing=${decks.skipped_existing}, failed=${decks.failed}, runtime=${Math.round(decks.runtimeMs / 1000)}s, batch_size=${decks.batchSize}. Missing deck before=${beforeMissingDeck}, after=${current.counts.missingDeck}. Touched: ${join(process.cwd(), "data", "ops", "intelligence", "deck-index.json")}.`,
    );
  }

  if (current.counts.missingDeck === 0 && current.counts.missingThumbnail > 0) {
    skipped.push("thumbnail worker not implemented");
  } else if (current.counts.missingDeck === 0 && current.counts.missingThumbnail === 0 && current.counts.missingPackage === 0 && current.counts.missingCover === 0) {
    details.push("complete: No VIDEO work remains.");
  }

  if (skipped.length > 0) {
    console.log("\nSkipped:");
    for (const line of skipped) console.log(`- ${line}`);
  }
  console.log("\nWorkers:");
  for (const detail of details) console.log(`- ${detail}`);
  const after = current;
  console.log("\nBefore/after:");
  console.log(JSON.stringify({ before: initial.counts, after: after.counts }, null, 2));
}

async function runDeckWorkerOnly(): Promise<void> {
  const before = await refreshVideoFactoryQueue();
  const result = await runVideoDeckBatch(before);
  const after = await refreshVideoFactoryQueue();
  console.log("\nDeck worker:");
  console.log(
    `attempted=${result.attempted}, promoted=${result.promoted}, generated=${result.generated}, skipped_existing=${result.skipped_existing}, failed=${result.failed}, runtime=${Math.round(result.runtimeMs / 1000)}s, batch_size=${result.batchSize}`,
  );
  console.log(`Missing deck before=${before.counts.missingDeck}, after=${after.counts.missingDeck}`);
  console.log("\nBefore/after:");
  console.log(JSON.stringify({ before: before.counts, after: after.counts }, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop(): Promise<void> {
  let stop = false;
  process.on("SIGINT", () => {
    stop = true;
    console.log("\nStopping VIDEO factory loop after current cycle...");
  });
  process.on("SIGTERM", () => {
    stop = true;
    console.log("\nStopping VIDEO factory loop after current cycle...");
  });

  while (!stop) {
    await runOnce();
    if (stop) break;
    console.log(`\nSleeping ${Math.round(LOOP_SLEEP_MS / 1000)}s. Ctrl+C to stop.`);
    await sleep(LOOP_SLEEP_MS);
  }
  console.log("VIDEO factory loop stopped cleanly.");
}

async function main() {
  const mode = process.argv[2] ?? "refresh";
  if (mode === "refresh") {
    await refreshVideoFactoryQueue();
    return;
  }
  if (mode === "run-once") {
    await runOnce();
    return;
  }
  if (mode === "deck-worker") {
    await runDeckWorkerOnly();
    return;
  }
  if (mode === "loop") {
    await loop();
    return;
  }
  throw new Error(`Unknown video factory mode: ${mode}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
