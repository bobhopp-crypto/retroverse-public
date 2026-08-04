import "server-only";

import { loadChartCoverageScan } from "@/lib/ops/virtualdj-media-coverage/chart-store";
import type { ChartCoverageResult } from "@/lib/ops/virtualdj-media-coverage/types";

import {
  createBatchId,
  createBatchManifest,
  findBatchItem,
  loadBatchManifest,
  saveBatchManifest,
  updateBatchItem,
  updateBatchManifest,
  batchIsTerminal,
} from "./batch-store";
import { checkLocalVideoOwnership } from "./check-local-video";
import { rankCandidatesForBatch } from "./confidence-gate";
import { defaultSearchQuery } from "./filenames";
import { listRecordedYoutubeIds } from "./manifest-store";
import { manifestPathForRvtr } from "./paths";
import { resolveTrustworthyGenre } from "./resolve-genre";
import {
  applyVdjLabelForAcquisitionFile,
  approveAcquisitionCandidate,
  executeApprovedAcquisition,
} from "./run-acquisition";
import { searchYouTubeCandidates } from "./search-candidates";
import type {
  BatchAcquireItem,
  BatchAcquireManifest,
  BatchDownloadStatus,
  VideoCandidate,
} from "./types";

const runningBatches = new Set<string>();

function resultMatchesFilter(result: ChartCoverageResult, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "unresolved") return result.target.unresolvedIdentity;
  if (filter === "both_missing") {
    return result.audio.effectiveStatus === "missing" && result.video.effectiveStatus === "missing";
  }
  if (filter === "audio_ready_video_missing") {
    return result.audio.effectiveStatus === "ready" && result.video.effectiveStatus === "missing";
  }
  const [axis, status] = filter.split("_", 2);
  if (axis === "audio") {
    const expected = status === "upgrade" ? "upgrade_recommended" : status;
    return result.audio.effectiveStatus === expected;
  }
  return result.video.effectiveStatus === status;
}

function candidateFields(candidate: VideoCandidate | null) {
  return {
    candidateId: candidate?.videoId ?? null,
    candidateUrl: candidate?.webpageUrl ?? null,
    candidateTitle: candidate?.title ?? null,
    candidateChannel: candidate?.channel ?? null,
    candidateThumbnailUrl: candidate?.thumbnailUrl ?? null,
    durationSeconds: candidate?.durationSeconds ?? null,
  };
}

function createBatchItemFromResult(result: ChartCoverageResult): BatchAcquireItem | null {
  const rvtr = result.rvtr ?? result.target.rvtr;
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr) || result.target.unresolvedIdentity) return null;
  return {
    targetRowKey: result.target.targetRowKey,
    rvtr,
    artist: result.target.artist,
    title: result.target.title,
    year: result.target.year,
    genre: null,
    genreSource: "none",
    chartRank: result.target.bestRank,
    searchCandidates: [],
    ...candidateFields(null),
    confidence: null,
    confidenceReasons: [],
    downloadStatus: "pending",
    reviewStatus: "none",
    finalFilePath: null,
    perRvtrManifestPath: null,
    errorMessage: null,
    vdjLabelStatus: null,
    vdjLabelMessage: null,
  };
}

export async function buildBatchPreview(input: {
  scanId: string;
  filter: string;
  limit: number;
}): Promise<{ items: BatchAcquireItem[]; scanLabel: string | null }> {
  const scan = await loadChartCoverageScan(input.scanId);
  if (!scan) throw new Error("Coverage scan not found");
  const items = scan.results
    .filter((result) => resultMatchesFilter(result, input.filter))
    .map(createBatchItemFromResult)
    .filter((item): item is BatchAcquireItem => item != null)
    .slice(0, input.limit);
  return { items, scanLabel: scan.selection.label ?? null };
}

export async function createBatchAcquireJob(input: {
  scanId: string;
  filter: string;
  limit: number;
}): Promise<BatchAcquireManifest> {
  const preview = await buildBatchPreview(input);
  if (!preview.items.length) throw new Error("No eligible songs found for this filter.");
  const batchId = createBatchId();
  const manifest = createBatchManifest({
    batchId,
    scanId: input.scanId,
    filter: input.filter,
    limit: input.limit,
    items: preview.items,
  });
  await saveBatchManifest(manifest);
  startBatchProcessing(batchId);
  return manifest;
}

export function startBatchProcessing(batchId: string): void {
  if (runningBatches.has(batchId)) return;
  runningBatches.add(batchId);
  void processBatch(batchId).finally(() => {
    runningBatches.delete(batchId);
  });
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  task: (value: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      await task(values[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
}

async function processBatch(batchId: string): Promise<void> {
  await updateBatchManifest(batchId, { status: "running" });
  const manifest = await loadBatchManifest(batchId);
  if (!manifest) return;
  const pending = manifest.items.filter((item) => item.downloadStatus === "pending");
  await mapWithConcurrency(pending, 2, async (item) => {
    await processBatchItem(batchId, item.targetRowKey);
  });
  const refreshed = await loadBatchManifest(batchId);
  if (!refreshed) return;
  await updateBatchManifest(batchId, {
    status: batchIsTerminal(refreshed) ? "complete" : refreshed.status,
  });
}

async function finalizeDownloadStatus(
  batchId: string,
  targetRowKey: string,
  rvtr: string,
  filePath: string,
): Promise<BatchDownloadStatus> {
  const labelOutcome = await applyVdjLabelForAcquisitionFile({ filePath, rvtr });
  await updateBatchItem(batchId, targetRowKey, {
    finalFilePath: filePath,
    perRvtrManifestPath: manifestPathForRvtr(rvtr),
    vdjLabelStatus: labelOutcome.vdjLabelStatus,
    vdjLabelMessage: labelOutcome.vdjLabelMessage,
    errorMessage: null,
    downloadStatus: labelOutcome.manualRescanRequired ? "awaiting_rescan" : "complete",
    reviewStatus: "kept",
  });
  return labelOutcome.manualRescanRequired ? "awaiting_rescan" : "complete";
}

async function approveAndExecuteBatchCandidate(input: {
  batchId: string;
  item: BatchAcquireItem;
  candidate: VideoCandidate;
}): Promise<void> {
  const { batchId, item, candidate } = input;
  await updateBatchItem(batchId, item.targetRowKey, {
    downloadStatus: "approved",
    ...candidateFields(candidate),
    confidenceReasons: item.confidenceReasons,
    errorMessage: null,
  });

  const approve = await approveAcquisitionCandidate({
    rvtr: item.rvtr,
    artist: item.artist,
    title: item.title,
    year: item.year,
    candidate,
    genre: item.genre,
    genreSource: item.genreSource,
  });
  if (!approve.ok) {
    await updateBatchItem(batchId, item.targetRowKey, {
      downloadStatus: "failed",
      errorMessage: approve.failure.message,
      reviewStatus: item.reviewStatus === "pending" ? "rejected" : item.reviewStatus,
    });
    return;
  }

  await updateBatchItem(batchId, item.targetRowKey, { downloadStatus: "downloading" });
  const execute = await executeApprovedAcquisition(item.rvtr);
  if (!execute.ok) {
    await updateBatchItem(batchId, item.targetRowKey, {
      downloadStatus: "failed",
      errorMessage: execute.failure.message,
      perRvtrManifestPath: manifestPathForRvtr(item.rvtr),
    });
    return;
  }

  await finalizeDownloadStatus(
    batchId,
    item.targetRowKey,
    item.rvtr,
    execute.completion.finalPath,
  );
}

export async function processBatchItem(batchId: string, targetRowKey: string): Promise<void> {
  const manifest = await loadBatchManifest(batchId);
  const item = manifest ? findBatchItem(manifest, targetRowKey) : null;
  if (!item) return;
  if (item.downloadStatus !== "pending" && item.downloadStatus !== "failed") return;

  await updateBatchItem(batchId, targetRowKey, {
    downloadStatus: "searching",
    errorMessage: null,
  });

  const owned = await checkLocalVideoOwnership({
    rvtr: item.rvtr,
    artist: item.artist,
    title: item.title,
  });
  if (owned.owned) {
    await updateBatchItem(batchId, targetRowKey, {
      downloadStatus: "skipped",
      finalFilePath: owned.filepath,
      errorMessage: "Local video already owned.",
      confidence: "reject",
      confidenceReasons: ["Local video already owned"],
    });
    return;
  }

  const genreInfo = await resolveTrustworthyGenre(item.rvtr);
  await updateBatchItem(batchId, targetRowKey, {
    genre: genreInfo.genre,
    genreSource: genreInfo.genreSource,
  });

  const search = await searchYouTubeCandidates({
    artist: item.artist,
    title: item.title,
    query: defaultSearchQuery(item.artist, item.title),
    limit: 8,
  });
  if (search.error || search.candidates.length === 0) {
    await updateBatchItem(batchId, targetRowKey, {
      downloadStatus: "failed",
      errorMessage: search.error ?? "No YouTube candidates found.",
      searchCandidates: [],
    });
    return;
  }

  const recorded = await listRecordedYoutubeIds(item.rvtr);
  const ranked = rankCandidatesForBatch({
    artist: item.artist,
    title: item.title,
    expectedDurationSeconds: null,
    candidates: search.candidates,
    recordedYoutubeIds: new Set(recorded.keys()),
  });

  const refreshed = await loadBatchManifest(batchId);
  const current = refreshed ? findBatchItem(refreshed, targetRowKey) : null;
  if (!current) return;

  const basePatch = {
    searchCandidates: search.candidates,
    genre: genreInfo.genre,
    genreSource: genreInfo.genreSource,
  };

  if (ranked.auto?.candidate) {
    await updateBatchItem(batchId, targetRowKey, {
      ...basePatch,
      confidence: "auto",
      confidenceReasons: ranked.auto.reasons,
      reviewStatus: "none",
      ...candidateFields(ranked.auto.candidate),
    });
    const updated = await loadBatchManifest(batchId);
    const ready = updated ? findBatchItem(updated, targetRowKey) : null;
    if (!ready?.candidateId) return;
    const candidate =
      search.candidates.find((entry) => entry.videoId === ready.candidateId) ?? ranked.auto.candidate;
    await approveAndExecuteBatchCandidate({ batchId, item: { ...ready, ...basePatch }, candidate });
    return;
  }

  if (ranked.review.length > 0) {
    const best = ranked.review[0]!;
    await updateBatchItem(batchId, targetRowKey, {
      ...basePatch,
      confidence: "review",
      confidenceReasons: best.reasons,
      downloadStatus: "needs_review",
      reviewStatus: "pending",
      ...candidateFields(best.candidate),
    });
    return;
  }

  const rejectReasons = ranked.reject[0]?.reasons ?? ["No acceptable candidates"];
  await updateBatchItem(batchId, targetRowKey, {
    ...basePatch,
    confidence: "reject",
    confidenceReasons: rejectReasons,
    downloadStatus: "failed",
    reviewStatus: "rejected",
    ...candidateFields(ranked.reject[0]?.candidate ?? null),
    errorMessage: rejectReasons.join("; "),
  });
}

export async function retryBatchItem(batchId: string, targetRowKey: string): Promise<void> {
  await updateBatchItem(batchId, targetRowKey, {
    downloadStatus: "pending",
    errorMessage: null,
    confidence: null,
    confidenceReasons: [],
    reviewStatus: "none",
    finalFilePath: null,
    vdjLabelStatus: null,
    vdjLabelMessage: null,
  });
  startBatchProcessing(batchId);
}

export async function keepBatchReviewItem(batchId: string, targetRowKey: string): Promise<BatchAcquireManifest> {
  const manifest = await loadBatchManifest(batchId);
  const item = manifest ? findBatchItem(manifest, targetRowKey) : null;
  if (!item) throw new Error("Batch item not found");
  const candidate =
    item.searchCandidates.find((entry) => entry.videoId === item.candidateId) ??
    item.searchCandidates[0];
  if (!candidate) throw new Error("No candidate selected for review item");
  await approveAndExecuteBatchCandidate({
    batchId,
    item: { ...item, reviewStatus: "pending" },
    candidate,
  });
  const refreshed = await loadBatchManifest(batchId);
  if (!refreshed) throw new Error("Batch manifest not found");
  return refreshed;
}

export async function rejectBatchReviewItem(batchId: string, targetRowKey: string): Promise<BatchAcquireManifest> {
  await updateBatchItem(batchId, targetRowKey, {
    downloadStatus: "failed",
    reviewStatus: "rejected",
    errorMessage: "Operator rejected candidate.",
  });
  const refreshed = await loadBatchManifest(batchId);
  if (!refreshed) throw new Error("Batch manifest not found");
  return refreshed;
}

export async function chooseBatchReviewCandidate(input: {
  batchId: string;
  targetRowKey: string;
  videoId: string;
}): Promise<BatchAcquireManifest> {
  const manifest = await loadBatchManifest(input.batchId);
  const item = manifest ? findBatchItem(manifest, input.targetRowKey) : null;
  if (!item) throw new Error("Batch item not found");
  const candidate = item.searchCandidates.find((entry) => entry.videoId === input.videoId);
  if (!candidate) throw new Error("Candidate not found on review item");
  await updateBatchItem(input.batchId, input.targetRowKey, {
    reviewStatus: "choose_another",
    ...candidateFields(candidate),
  });
  await approveAndExecuteBatchCandidate({
    batchId: input.batchId,
    item: { ...item, reviewStatus: "choose_another" },
    candidate,
  });
  const refreshed = await loadBatchManifest(input.batchId);
  if (!refreshed) throw new Error("Batch manifest not found");
  return refreshed;
}

export async function recheckBatchAfterRescan(batchId: string): Promise<{
  manifest: BatchAcquireManifest;
  completed: string[];
  stillAwaiting: string[];
}> {
  const manifest = await loadBatchManifest(batchId);
  if (!manifest) throw new Error("Batch manifest not found");

  const completed: string[] = [];
  const stillAwaiting: string[] = [];

  for (const item of manifest.items) {
    if (item.downloadStatus !== "awaiting_rescan" || !item.finalFilePath) continue;
    const labelOutcome = await applyVdjLabelForAcquisitionFile({
      filePath: item.finalFilePath,
      rvtr: item.rvtr,
    });
    if (labelOutcome.manualRescanRequired) {
      stillAwaiting.push(item.rvtr);
      await updateBatchItem(batchId, item.targetRowKey, {
        vdjLabelStatus: labelOutcome.vdjLabelStatus,
        vdjLabelMessage: labelOutcome.vdjLabelMessage,
      });
      continue;
    }
    completed.push(item.rvtr);
    await updateBatchItem(batchId, item.targetRowKey, {
      downloadStatus: "complete",
      vdjLabelStatus: labelOutcome.vdjLabelStatus,
      vdjLabelMessage: labelOutcome.vdjLabelMessage,
      errorMessage: null,
    });
  }

  const refreshed = await loadBatchManifest(batchId);
  if (!refreshed) throw new Error("Batch manifest not found");
  await updateBatchManifest(batchId, {
    status: batchIsTerminal(refreshed) ? "complete" : refreshed.status,
  });
  const finalManifest = await loadBatchManifest(batchId);
  if (!finalManifest) throw new Error("Batch manifest not found");
  return { manifest: finalManifest, completed, stillAwaiting };
}

export async function getLatestOpenBatchForScan(scanId: string): Promise<BatchAcquireManifest | null> {
  // Lightweight: caller can pass explicit batchId; this helper optional.
  void scanId;
  return null;
}
