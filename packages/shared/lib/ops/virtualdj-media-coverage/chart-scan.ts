import "server-only";

import { createHash } from "crypto";

import { classifyChartAudio, summarizeChartCoverage } from "./chart-classification";
import {
  carryChartDecisionHistory,
  loadLatestChartScan,
  saveChartCoverageScan,
} from "./chart-store";
import { matchTargetAgainstInventory } from "./match";
import {
  loadStructuredRelationships,
  type StructuredTargetRelationship,
} from "./structured-relationships";
import {
  billboardSelection,
  loadBillboardTargets,
} from "./targets/billboard-hot100";
import type {
  BillboardSelection,
  BillboardSetType,
  BillboardTargetSong,
  ChartCoverageResult,
  ChartCoverageScan,
} from "./types";
import {
  artistTitleKey,
  buildVirtualDjLibraryIndex,
  type VirtualDjLibraryIndex,
} from "./vdj-index";
import { classifyVideoCoverage } from "./video/classify-coverage";

function chartScanId(selection: BillboardSelection, inventoryFingerprint: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = createHash("sha256")
    .update(`${selection.selectionKey}\0${inventoryFingerprint}\0${Date.now()}`)
    .digest("hex")
    .slice(0, 10);
  return `coverage-${stamp}-${suffix}`;
}

async function mapWithConcurrency<T, U>(
  values: T[],
  concurrency: number,
  task: (value: T, index: number) => Promise<U>,
): Promise<U[]> {
  const out = new Array<U>(values.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++;
      out[index] = await task(values[index]!, index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return out;
}

async function resolveChartTarget(input: {
  target: BillboardTargetSong;
  inventory: VirtualDjLibraryIndex;
  previous: ChartCoverageScan | null;
  structured: StructuredTargetRelationship | null;
}): Promise<ChartCoverageResult> {
  const matched = await matchTargetAgainstInventory(
    input.target,
    input.inventory,
    input.structured,
  );
  const automaticAudio = classifyChartAudio({
    target: input.target,
    rvtr: matched.rvtr,
    candidates: matched.candidates,
  });
  const automaticVideo = classifyVideoCoverage({
    target: input.target,
    candidates: matched.candidates,
  });
  const audioHistory = carryChartDecisionHistory({
    previous: input.previous,
    targetRowKey: input.target.targetRowKey,
    axis: "audio",
    candidates: matched.candidates,
    automaticWinnerPath: automaticAudio.winnerPath,
    inventoryFingerprint: input.inventory.summary.fingerprint,
  });
  const videoHistory = carryChartDecisionHistory({
    previous: input.previous,
    targetRowKey: input.target.targetRowKey,
    axis: "video",
    candidates: matched.candidates,
    automaticWinnerPath: automaticVideo.winnerPath,
    inventoryFingerprint: input.inventory.summary.fingerprint,
  });
  return {
    target: input.target,
    rvtr: matched.rvtr,
    candidates: matched.candidates,
    audio: classifyChartAudio({
      target: input.target,
      rvtr: matched.rvtr,
      candidates: matched.candidates,
      decisionHistory: audioHistory,
    }),
    video: classifyVideoCoverage({
      target: input.target,
      candidates: matched.candidates,
      decisionHistory: videoHistory,
    }),
  };
}

export async function runBillboardCoverageScan(input: {
  setType: BillboardSetType;
  year: number;
  chartDate?: string | null;
}): Promise<ChartCoverageScan> {
  const selection = billboardSelection(input);

  // Ownership authority is deliberately established before target comparison.
  const inventory = await buildVirtualDjLibraryIndex();
  const targets = await loadBillboardTargets(selection);
  const previous = await loadLatestChartScan(selection.selectionKey);
  const structured = await loadStructuredRelationships(targets);
  const results = await mapWithConcurrency(targets, 4, (target) =>
    resolveChartTarget({
      target,
      inventory,
      previous,
      structured: structured.get(artistTitleKey(target.artist, target.title)) ?? null,
    }),
  );
  const now = new Date().toISOString();
  const scan: ChartCoverageScan = {
    version: 2,
    productVersion: "billboard_media_coverage_v1",
    mode: "billboard_media_coverage",
    targetType: "billboard_hot100",
    id: chartScanId(selection, inventory.summary.fingerprint),
    selection,
    inventory: inventory.summary,
    createdAt: now,
    updatedAt: now,
    summary: summarizeChartCoverage(results),
    results,
  };
  await saveChartCoverageScan(scan);
  return scan;
}
