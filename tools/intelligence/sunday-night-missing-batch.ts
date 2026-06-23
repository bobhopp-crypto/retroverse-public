#!/usr/bin/env npx tsx
/**
 * Sunday Nights missing package batch.
 *
 * Uses processSong() directly so packages are saved as Review and publishing is never attempted.
 *
 * Usage:
 *   npm run intelligence:sunday-missing
 *   npm run intelligence:sunday-missing -- --fresh
 *   npm run intelligence:sunday-missing -- --limit 10
 *   npm run intelligence:sunday-missing -- --retry-failed
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { buildCardsFromReview, processSong } from "../../lib/ops/intelligence/process-song.ts";
import { loadSongPackage, saveSongPackage } from "../../lib/ops/intelligence/song-package-store.ts";
import { loadSundayEventSongs } from "../../lib/sunday-nights/load-playlist.ts";

type SundayNightBatchJob = {
  rvtr: string;
  title: string;
  artist: string;
  year: number;
  status: "pending" | "running" | "review" | "skipped" | "failed";
  startedAt?: string;
  completedAt?: string;
  runtimeMs?: number;
  facts?: number;
  stories?: number;
  cards?: number;
  sources?: number;
  error?: string;
};

type SundayNightBatchState = {
  version: 1;
  label: "Sunday Nights Missing Package Batch";
  createdAt: string;
  updatedAt: string;
  totalQueued: number;
  jobs: SundayNightBatchJob[];
  summary: {
    processed: number;
    reviewCreated: number;
    skipped: number;
    failed: number;
    throughputPerHour: number;
    etaMinutes: number;
  };
};

const STATE_PATH = join(process.cwd(), "reports/intelligence/sunday-night-missing-package-batch.json");

function parseArgs(argv: string[]) {
  const limitIndex = argv.findIndex((arg) => arg === "--limit");
  const parsedLimit = limitIndex >= 0 ? Number.parseInt(argv[limitIndex + 1] ?? "", 10) : null;
  return {
    fresh: argv.includes("--fresh"),
    retryFailed: argv.includes("--retry-failed"),
    cardsOnly: argv.includes("--cards-only"),
    limit: Number.isFinite(parsedLimit) && parsedLimit! > 0 ? parsedLimit : null,
  };
}

function emptySummary(): SundayNightBatchState["summary"] {
  return {
    processed: 0,
    reviewCreated: 0,
    skipped: 0,
    failed: 0,
    throughputPerHour: 0,
    etaMinutes: 0,
  };
}

async function loadState(): Promise<SundayNightBatchState | null> {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SundayNightBatchState;
    if (!Array.isArray(parsed.jobs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveState(state: SundayNightBatchState): Promise<void> {
  await mkdir(join(process.cwd(), "reports/intelligence"), { recursive: true });
  await writeFile(
    STATE_PATH,
    `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

async function buildInitialState(): Promise<SundayNightBatchState> {
  const event = await loadSundayEventSongs("all");
  const byRvtr = new Map<string, SundayNightBatchJob>();

  for (const song of event.songs) {
    if (!song.rvtr || byRvtr.has(song.rvtr)) continue;
    const existing = await loadSongPackage(song.rvtr);
    if (existing) continue;
    byRvtr.set(song.rvtr, {
      rvtr: song.rvtr,
      title: song.title,
      artist: song.artist,
      year: song.year,
      status: "pending",
    });
  }

  const now = new Date().toISOString();
  return {
    version: 1,
    label: "Sunday Nights Missing Package Batch",
    createdAt: now,
    updatedAt: now,
    totalQueued: byRvtr.size,
    jobs: [...byRvtr.values()],
    summary: emptySummary(),
  };
}

function computeSummary(state: SundayNightBatchState): SundayNightBatchState["summary"] {
  const completed = state.jobs.filter((job) => job.status === "review" || job.status === "skipped" || job.status === "failed");
  const runtimes = state.jobs
    .filter((job) => job.status === "review" && job.runtimeMs)
    .map((job) => job.runtimeMs!);
  const avgRuntimeMs =
    runtimes.length > 0 ? runtimes.reduce((total, ms) => total + ms, 0) / runtimes.length : 40_000;
  const remaining = state.jobs.filter((job) => job.status === "pending").length;

  return {
    processed: completed.length,
    reviewCreated: state.jobs.filter((job) => job.status === "review").length,
    skipped: state.jobs.filter((job) => job.status === "skipped").length,
    failed: state.jobs.filter((job) => job.status === "failed").length,
    throughputPerHour: Math.round((3_600_000 / avgRuntimeMs) * 10) / 10,
    etaMinutes: Math.round((remaining * avgRuntimeMs) / 60_000),
  };
}

async function recalculateSundayCoverage() {
  const event = await loadSundayEventSongs("all");
  const rvtrs = [...new Set(event.songs.map((song) => song.rvtr).filter((rvtr): rvtr is string => Boolean(rvtr)))];
  const coverage = { songs: event.songs.length, uniqueRvtrs: rvtrs.length, published: 0, review: 0, draft: 0, other: 0, missing: 0 };

  for (const rvtr of rvtrs) {
    const pkg = await loadSongPackage(rvtr);
    if (!pkg) coverage.missing += 1;
    else if (pkg.status === "published") coverage.published += 1;
    else if (pkg.status === "review") coverage.review += 1;
    else if (pkg.status === "draft") coverage.draft += 1;
    else coverage.other += 1;
  }

  return coverage;
}

async function buildMissingCards(state: SundayNightBatchState): Promise<SundayNightBatchState> {
  for (const job of state.jobs.filter((item) => item.status === "review")) {
    const pkg = await loadSongPackage(job.rvtr);
    if (!pkg || pkg.storyCards.length > 0) continue;
    const cards = await buildCardsFromReview(job.rvtr);
    if (!cards.package) continue;
    const savedPackage = await saveSongPackage({ ...cards.package, status: "review", publishedAt: null });
    state.jobs = state.jobs.map((item) =>
      item.rvtr === job.rvtr
        ? {
            ...item,
            sources: savedPackage.researchVault.length,
            facts: savedPackage.candidateFacts.length,
            stories: savedPackage.candidateStories.length,
            cards: savedPackage.storyCards.length,
          }
        : item,
    );
    await saveState(state);
    console.log(`  · ${job.rvtr}: cards built (${savedPackage.storyCards.length})`);
  }
  return state;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let state = options.fresh ? null : await loadState();

  if (!state) {
    state = await buildInitialState();
    await saveState(state);
  }

  if (options.retryFailed) {
    state.jobs = state.jobs.map((job) => (job.status === "failed" ? { ...job, status: "pending", error: undefined } : job));
  }

  if (options.cardsOnly) {
    console.log("\nSunday Nights Missing Package Batch · Cards Only");
    state = await buildMissingCards(state);
    state.summary = computeSummary(state);
    await saveState(state);
    console.log(`  Review created: ${state.summary.reviewCreated}`);
    console.log(`  Failed: ${state.summary.failed}`);
    console.log(`  ETA: ~${state.summary.etaMinutes} min\n`);
    return;
  }

  const pending = state.jobs.filter((job) => job.status === "pending").slice(0, options.limit ?? undefined);

  console.log("\nSunday Nights Missing Package Batch");
  console.log(`  Total queued: ${state.totalQueued}`);
  console.log(`  Pending this run: ${pending.length}`);
  console.log("  Mode: processSong + cards · save Review · no publish attempt\n");

  for (const job of pending) {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    state.jobs = state.jobs.map((item) => (item.rvtr === job.rvtr ? { ...item, status: "running", startedAt } : item));
    state.summary = computeSummary(state);
    await saveState(state);

    const existing = await loadSongPackage(job.rvtr);
    if (existing) {
      const runtimeMs = Date.now() - t0;
      state.jobs = state.jobs.map((item) =>
        item.rvtr === job.rvtr
          ? { ...item, status: "skipped", completedAt: new Date().toISOString(), runtimeMs, error: `existing_package:${existing.status}` }
          : item,
      );
      state.summary = computeSummary(state);
      await saveState(state);
      console.log(`  · ${job.rvtr}: skipped (${existing.status})`);
      continue;
    }

    const result = await processSong(job.rvtr);
    const runtimeMs = Date.now() - t0;

    if (result.ok && result.package.status === "review") {
      const cards = await buildCardsFromReview(job.rvtr);
      const savedPackage = cards.package
        ? await saveSongPackage({ ...cards.package, status: "review", publishedAt: null })
        : result.package;
      state.jobs = state.jobs.map((item) =>
        item.rvtr === job.rvtr
          ? {
              ...item,
              status: "review",
              completedAt: new Date().toISOString(),
              runtimeMs,
              sources: savedPackage.researchVault.length,
              facts: savedPackage.candidateFacts.length,
              stories: savedPackage.candidateStories.length,
              cards: savedPackage.storyCards.length,
            }
          : item,
      );
      state.summary = computeSummary(state);
      await saveState(state);
      console.log(`  · ${job.rvtr}: review + ${savedPackage.storyCards.length} cards (${Math.round(runtimeMs / 1000)}s)`);
    } else {
      state.jobs = state.jobs.map((item) =>
        item.rvtr === job.rvtr
          ? {
              ...item,
              status: "failed",
              completedAt: new Date().toISOString(),
              runtimeMs,
              error: result.error ?? `unexpected_status:${result.package.status}`,
            }
          : item,
      );
      state.summary = computeSummary(state);
      await saveState(state);
      console.log(`  · ${job.rvtr}: failed — ${result.error ?? result.package.status}`);
    }
  }

  state.summary = computeSummary(state);
  await saveState(state);
  const coverage = await recalculateSundayCoverage();

  console.log("\nSummary");
  console.log(`  Total queued:    ${state.totalQueued}`);
  console.log(`  Processed:       ${state.summary.processed}`);
  console.log(`  Review created:  ${state.summary.reviewCreated}`);
  console.log(`  Failed:          ${state.summary.failed}`);
  console.log(`  Throughput:      ${state.summary.throughputPerHour}/hour`);
  console.log(`  ETA:             ~${state.summary.etaMinutes} min`);
  console.log("\nSunday Nights Coverage");
  console.log(`  Songs:           ${coverage.songs}`);
  console.log(`  Unique RVTRs:    ${coverage.uniqueRvtrs}`);
  console.log(`  Published:       ${coverage.published}`);
  console.log(`  Review:          ${coverage.review}`);
  console.log(`  Draft:           ${coverage.draft}`);
  console.log(`  Other:           ${coverage.other}`);
  console.log(`  Missing:         ${coverage.missing}`);
  console.log(`\nState: ${STATE_PATH}\n`);

  if (state.summary.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
