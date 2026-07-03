import { readFile, writeFile, mkdir } from "fs/promises";

import { getBatchJob, loadBatchStatus, saveBatchStatus, upsertBatchJob } from "./batch-status";
import { loadVideoBackfillCoverage } from "./backfill-coverage";
import {
  buildVideoBackfillQueue,
  loadBackfillQueue,
  nextPackageQueueRvtrs,
  saveBackfillQueue,
} from "./backfill-queue";
import { computeArtifactReadiness } from "./artifact-readiness";
import { runForcedProductionPipeline } from "./production-pipeline";
import { backfillStatePath } from "./paths";
import { loadSongPackage } from "./song-package-store";

export type BackfillState = {
  version: 1;
  updatedAt: string;
  failureCounts: Record<string, number>;
  lastRunAt: string | null;
  totalProcessed: number;
  totalPublished: number;
};

export type BackfillRunSummary = {
  processed: number;
  review: number;
  published: number;
  skipped: number;
  failed: number;
  totalRuntimeMs: number;
  estimatedRemainingMinutes: number;
  jobs: Array<{ rvtr: string; status: string; runtimeMs?: number; error?: string }>;
};

const FAILURE_SKIP_THRESHOLD = 3;

async function loadBackfillState(): Promise<BackfillState> {
  try {
    const raw = await readFile(backfillStatePath(), "utf8");
    return JSON.parse(raw) as BackfillState;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      failureCounts: {},
      lastRunAt: null,
      totalProcessed: 0,
      totalPublished: 0,
    };
  }
}

async function saveBackfillState(state: BackfillState): Promise<void> {
  await mkdir(backfillStatePath().replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(backfillStatePath(), `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

async function refreshQueue(): Promise<void> {
  const { videos } = await loadVideoBackfillCoverage();
  const queue = buildVideoBackfillQueue(videos);
  await saveBackfillQueue(queue);
}

export async function runBackfillBatch(options: {
  limit: number;
  resume?: boolean;
  failureThreshold?: number;
}): Promise<BackfillRunSummary> {
  await refreshQueue();
  const queue = await loadBackfillQueue();
  const state = await loadBackfillState();
  const batch = await loadBatchStatus();
  const threshold = options.failureThreshold ?? FAILURE_SKIP_THRESHOLD;

  const skip = new Set<string>();
  if (options.resume !== false) {
    for (const entry of queue.entries) {
      if (entry.filter === "missing_cover") continue;
      const pkg = await loadSongPackage(entry.rvtr);
      if (pkg?.status === "review" || pkg?.status === "cards_ready" || pkg?.status === "approved") {
        skip.add(entry.rvtr);
      }
      if (pkg?.status === "published" && computeArtifactReadiness(pkg).allReady) skip.add(entry.rvtr);
      if ((state.failureCounts[entry.rvtr] ?? 0) >= threshold) skip.add(entry.rvtr);
      const prior = getBatchJob(batch, entry.rvtr);
      if (prior?.status === "published" || prior?.status === "review") skip.add(entry.rvtr);
    }
  }

  const rvtrs = nextPackageQueueRvtrs(queue, options.limit, skip);
  const summary: BackfillRunSummary = {
    processed: 0,
    review: 0,
    published: 0,
    skipped: skip.size,
    failed: 0,
    totalRuntimeMs: 0,
    estimatedRemainingMinutes: 0,
    jobs: [],
  };

  let batchFile = batch;

  for (const rvtr of rvtrs) {
    const meta = queue.entries.find((e) => e.rvtr === rvtr && e.filter !== "missing_cover");
    if (!meta) continue;

    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    batchFile = upsertBatchJob(batchFile, {
      rvtr,
      title: meta.title,
      artist: meta.artist,
      status: "running",
      startedAt,
    });
    await saveBatchStatus(batchFile);

    const outcome = await runForcedProductionPipeline(rvtr);
    const runtimeMs = Date.now() - t0;
    summary.processed += 1;
    summary.totalRuntimeMs += runtimeMs;
    state.totalProcessed += 1;

    if (outcome.ok && outcome.published) {
      summary.published += 1;
      state.totalPublished += 1;
      state.failureCounts[rvtr] = 0;
      const pkg = outcome.package;
      const artifacts = computeArtifactReadiness(pkg);
      batchFile = upsertBatchJob(batchFile, {
        rvtr,
        title: pkg.metadata.title,
        artist: pkg.metadata.artist,
        status: "published",
        startedAt,
        completedAt: new Date().toISOString(),
        runtimeMs,
        sources: pkg.researchVault.length,
        facts: outcome.approvedFacts,
        stories: pkg.storyCards.filter((c) => c.rank > 0).length,
        artifacts: artifacts.allReady ? 4 : 3,
      });
      summary.jobs.push({ rvtr, status: "published", runtimeMs });
    } else if (outcome.ok && outcome.publishBlocked) {
      summary.review += 1;
      state.failureCounts[rvtr] = 0;
      const pkg = outcome.package;
      batchFile = upsertBatchJob(batchFile, {
        rvtr,
        title: pkg.metadata.title,
        artist: pkg.metadata.artist,
        status: "review",
        startedAt,
        completedAt: new Date().toISOString(),
        runtimeMs,
        sources: pkg.researchVault.length,
        facts: outcome.approvedFacts,
        stories: pkg.candidateStories.length,
        artifacts: 0,
        error: outcome.error,
      });
      summary.jobs.push({ rvtr, status: "review", runtimeMs, error: outcome.error });
    } else {
      summary.failed += 1;
      state.failureCounts[rvtr] = (state.failureCounts[rvtr] ?? 0) + 1;
      batchFile = upsertBatchJob(batchFile, {
        rvtr,
        title: meta.title,
        artist: meta.artist,
        status: "failed",
        startedAt,
        completedAt: new Date().toISOString(),
        runtimeMs,
        error: outcome.error ?? "pipeline_failed",
      });
      summary.jobs.push({
        rvtr,
        status: "failed",
        runtimeMs,
        error: outcome.error,
      });
    }

    await saveBatchStatus(batchFile);
  }

  state.lastRunAt = new Date().toISOString();
  const avgMs = summary.processed > 0 ? summary.totalRuntimeMs / summary.processed : 45_000;
  const packagePending = queue.entries.filter(
    (e) => (e.filter === "missing_package" || e.filter === "missing_artifacts") && !skip.has(e.rvtr),
  ).length;
  summary.estimatedRemainingMinutes = Math.round((packagePending * avgMs) / 60_000);

  await saveBackfillState(state);
  await refreshQueue();

  return summary;
}

export async function estimateBackfillRemaining(): Promise<number> {
  const { coverage } = await loadVideoBackfillCoverage();
  const artifactBacklog = Math.max(0, coverage.videosWithPackage - coverage.videosWithArtifacts);
  const pending = coverage.missingPackages + artifactBacklog;
  return Math.round(pending * (coverage.estimatedMinutesNext10 / 10));
}
