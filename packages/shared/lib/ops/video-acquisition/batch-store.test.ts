import assert from "node:assert/strict";
import test from "node:test";

import {
  countBatchStatus,
  createBatchManifest,
  summarizeBatchItems,
} from "./batch-summary";
import type { BatchAcquireItem } from "./types";

function item(overrides: Partial<BatchAcquireItem>): BatchAcquireItem {
  return {
    targetRowKey: "row-1",
    rvtr: "RVTR000001",
    artist: "Artist",
    title: "Title",
    year: 1969,
    genre: null,
    genreSource: "none",
    chartRank: 1,
    searchCandidates: [],
    candidateId: null,
    candidateUrl: null,
    candidateTitle: null,
    candidateChannel: null,
    candidateThumbnailUrl: null,
    durationSeconds: null,
    confidence: null,
    confidenceReasons: [],
    downloadStatus: "pending",
    reviewStatus: "none",
    finalFilePath: null,
    perRvtrManifestPath: null,
    errorMessage: null,
    vdjLabelStatus: null,
    vdjLabelMessage: null,
    ...overrides,
  };
}

test("batch summary counts reflect item states", () => {
  const summary = summarizeBatchItems([
    item({ downloadStatus: "pending" }),
    item({ targetRowKey: "row-2", downloadStatus: "needs_review" }),
    item({ targetRowKey: "row-3", downloadStatus: "awaiting_rescan" }),
    item({ targetRowKey: "row-4", downloadStatus: "complete" }),
  ]);
  assert.equal(summary.queued, 1);
  assert.equal(summary.needsReview, 1);
  assert.equal(summary.awaitingRescan, 1);
  assert.equal(summary.complete, 1);
});

test("createBatchManifest initializes queued batch", () => {
  const manifest = createBatchManifest({
    batchId: "batch-test",
    scanId: "scan-test",
    filter: "video_missing",
    limit: 3,
    items: [item({})],
  });
  assert.equal(manifest.status, "queued");
  assert.equal(manifest.summary.queued, 1);
});

test("retry preservation keeps item identity fields", () => {
  const manifest = createBatchManifest({
    batchId: "batch-test",
    scanId: "scan-test",
    filter: "video_missing",
    limit: 3,
    items: [item({ downloadStatus: "failed", errorMessage: "download failed" })],
  });
  const retried = {
    ...manifest.items[0]!,
    downloadStatus: "pending" as const,
    errorMessage: null,
  };
  assert.equal(retried.rvtr, "RVTR000001");
  assert.equal(retried.targetRowKey, "row-1");
  assert.equal(countBatchStatus([retried], "pending"), 1);
});

test("review action persistence fields exist on item", () => {
  const reviewed = item({
    downloadStatus: "needs_review",
    reviewStatus: "pending",
    confidence: "review",
    confidenceReasons: ["Fan upload channel"],
  });
  assert.equal(reviewed.reviewStatus, "pending");
  assert.equal(reviewed.confidence, "review");
});
