import { inspectQuery } from "@/lib/inspect/pg";

import { getBatchJob, loadBatchStatus, saveBatchStatus, upsertBatchJob } from "./batch-status";
import { loadSongMetadata } from "./load-song-metadata";
import { runProductionPipeline } from "./production-pipeline";
import { loadSongPackage } from "./song-package-store";

export type BatchRunOptions = {
  limit?: number;
  all?: boolean;
  resume?: boolean;
  force?: boolean;
  rvtrs?: string[];
};

export type BatchRunSummary = {
  processed: number;
  published: number;
  skipped: number;
  failed: number;
  totalRuntimeMs: number;
  jobs: Array<{
    rvtr: string;
    status: string;
    runtimeMs?: number;
    error?: string;
  }>;
};

async function listTargetRvtrs(limit: number): Promise<string[]> {
  const rows = await inspectQuery<{ track_id: string }>(
    `
    SELECT track_id
    FROM canonical_track_display
    WHERE has_hot100 = true
    ORDER BY peak_hot100_position ASC NULLS LAST, canonical_title ASC
    LIMIT $1
    `,
    [limit],
  );
  return rows.map((r) => r.track_id.toUpperCase());
}

export async function runIntelligenceBatch(options: BatchRunOptions = {}): Promise<BatchRunSummary> {
  const limit = options.all ? 100_000 : (options.limit ?? 10);
  const rvtrs =
    options.rvtrs && options.rvtrs.length > 0
      ? options.rvtrs.map((r) => r.toUpperCase())
      : await listTargetRvtrs(limit);

  let batch = await loadBatchStatus();
  const summary: BatchRunSummary = {
    processed: 0,
    published: 0,
    skipped: 0,
    failed: 0,
    totalRuntimeMs: 0,
    jobs: [],
  };

  for (const rvtr of rvtrs) {
    const existingPkg = await loadSongPackage(rvtr);
    const prior = getBatchJob(batch, rvtr);

    if (
      options.resume &&
      !options.force &&
      (existingPkg?.status === "published" || prior?.status === "published")
    ) {
      summary.skipped += 1;
      summary.jobs.push({ rvtr, status: "skipped" });
      continue;
    }

    const meta = await loadSongMetadata(rvtr);
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    batch = upsertBatchJob(batch, {
      rvtr,
      title: meta?.title ?? rvtr,
      artist: meta?.artist ?? "",
      status: "running",
      startedAt,
    });
    await saveBatchStatus(batch);

    const result = await runProductionPipeline(rvtr, { force: options.force });
    const runtimeMs = Date.now() - t0;
    summary.processed += 1;
    summary.totalRuntimeMs += runtimeMs;

    if (result.ok && result.published) {
      summary.published += 1;
      const pkg = result.package;
      const job = {
        rvtr,
        title: pkg.metadata.title,
        artist: pkg.metadata.artist,
        status: "published" as const,
        startedAt,
        completedAt: new Date().toISOString(),
        runtimeMs,
        sources: pkg.researchVault.length,
        facts: result.approvedFacts,
        stories: pkg.storyCards.filter((c) => c.rank > 0).length,
        artifacts: 4,
      };
      batch = upsertBatchJob(batch, job);
      summary.jobs.push({ rvtr, status: "published", runtimeMs });
    } else {
      summary.failed += 1;
      const job = {
        rvtr,
        title: meta?.title ?? rvtr,
        artist: meta?.artist ?? "",
        status: "failed" as const,
        startedAt,
        completedAt: new Date().toISOString(),
        runtimeMs,
        error: result.error ?? "pipeline_failed",
      };
      batch = upsertBatchJob(batch, job);
      summary.jobs.push({ rvtr, status: "failed", runtimeMs, error: job.error });
    }

    await saveBatchStatus(batch);
  }

  return summary;
}
