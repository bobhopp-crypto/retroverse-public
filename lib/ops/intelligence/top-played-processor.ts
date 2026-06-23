import { getBatchJob, loadBatchStatus, saveBatchStatus, upsertBatchJob } from "./batch-status";
import { computeArtifactReadiness } from "./artifact-readiness";
import { runForcedProductionPipeline } from "./production-pipeline";
import {
  loadTopPlayedBackfill,
  topPlayedPackageQueueRvtrs,
  type TopPlayedBackfillData,
} from "./top-played-backfill";
import type { BackfillRunSummary } from "./backfill-processor";

/** Process top-played VIDEO tracks — play count DESC, cover required. */
export async function runTopPlayedBackfillBatch(options: {
  limit: number;
  cohort?: 25 | 50 | 100;
  resume?: boolean;
}): Promise<BackfillRunSummary & { cohort: number }> {
  const data = await loadTopPlayedBackfill();
  const cohortSize = options.cohort ?? 100;
  const cohortTracks = data.tracks.slice(0, cohortSize);
  const cohortRvtrs = new Set(
    cohortTracks.map((t) => t.rvtr).filter((r): r is string => Boolean(r)),
  );

  const batch = await loadBatchStatus();
  const skip = new Set<string>();
  if (options.resume !== false) {
    for (const track of cohortTracks) {
      if (!track.rvtr) continue;
      if (track.retroverseReady) skip.add(track.rvtr);
      if (track.status === "review" || track.status === "cards_ready" || track.status === "approved") {
        skip.add(track.rvtr);
      }
      const prior = getBatchJob(batch, track.rvtr);
      if (prior?.status === "published" || prior?.status === "review") skip.add(track.rvtr);
    }
  }

  const limitedData: TopPlayedBackfillData = {
    ...data,
    tracks: data.tracks.slice(0, cohortSize),
  };
  const rvtrs = topPlayedPackageQueueRvtrs(limitedData, options.limit, skip);

  const summary: BackfillRunSummary & { cohort: number } = {
    processed: 0,
    review: 0,
    published: 0,
    skipped: skip.size,
    failed: 0,
    totalRuntimeMs: 0,
    estimatedRemainingMinutes: 0,
    jobs: [],
    cohort: cohortSize,
  };

  let batchFile = batch;
  const trackByRvtr = new Map(cohortTracks.filter((t) => t.rvtr).map((t) => [t.rvtr!, t]));

  for (const rvtr of rvtrs) {
    if (!cohortRvtrs.has(rvtr)) continue;
    const track = trackByRvtr.get(rvtr);
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    batchFile = upsertBatchJob(batchFile, {
      rvtr,
      title: track?.title ?? rvtr,
      artist: track?.artist ?? "",
      status: "running",
      startedAt,
    });
    await saveBatchStatus(batchFile);

    const outcome = await runForcedProductionPipeline(rvtr);
    const runtimeMs = Date.now() - t0;
    summary.processed += 1;
    summary.totalRuntimeMs += runtimeMs;

    if (outcome.ok && outcome.published) {
      summary.published += 1;
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
      batchFile = upsertBatchJob(batchFile, {
        rvtr,
        title: track?.title ?? rvtr,
        artist: track?.artist ?? "",
        status: "failed",
        startedAt,
        completedAt: new Date().toISOString(),
        runtimeMs,
        error: outcome.error ?? "pipeline_failed",
      });
      summary.jobs.push({ rvtr, status: "failed", runtimeMs, error: outcome.error });
    }
    await saveBatchStatus(batchFile);
  }

  const avgMs = summary.processed > 0 ? summary.totalRuntimeMs / summary.processed : data.avgRuntimeMs;
  const pending = limitedData.workRemaining.totalPipelineRuns - summary.processed;
  summary.estimatedRemainingMinutes = Math.round((pending * avgMs) / 60_000);

  return summary;
}
