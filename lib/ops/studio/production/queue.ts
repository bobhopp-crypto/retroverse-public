import "server-only";

import { loadPublisherStore } from "@/lib/ops/studio/publisher/store";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";

import { loadProductionCandidateRows } from "./load-candidate-rows";
import type { ProductionCandidateRow } from "./load-candidate-rows";
import { assessPackagePipelineStage, type PackageStageContext } from "./package-stage";

export type ProductionQueueOptions = {
  /** Stop after N eligible songs (0 = no cap). */
  limit: number;
  skipCollector: boolean;
  force: boolean;
  /** Skip RVTRs already completed in a resumed run. */
  excludeRvtrs?: Set<string>;
  /** Reuse publisher index — avoids parsing store per song. */
  publisherByRvtr?: Map<string, PublisherRecord>;
  /** Pre-loaded VDJ rows — skips index parse when provided. */
  candidateRows?: ProductionCandidateRow[];
};

export type ProductionQueueItem = {
  rvtr: string;
  artist: string;
  title: string;
  playCount: number;
  reason: string;
  filePath: string | null;
};

export type ProductionQueueBuildResult = {
  items: ProductionQueueItem[];
  candidateRowCount: number;
  rowsScanned: number;
  publisherRecordCount: number;
};

/** Select songs needing the next pipeline stage (play-count order, early exit on limit). */
export async function selectProductionQueue(
  options: ProductionQueueOptions,
): Promise<ProductionQueueItem[]> {
  const built = await buildProductionQueue(options);
  return built.items;
}

export async function buildProductionQueue(
  options: ProductionQueueOptions,
): Promise<ProductionQueueBuildResult> {
  const publisherStore = options.publisherByRvtr
    ? null
    : await loadPublisherStore();
  const publisherByRvtr =
    options.publisherByRvtr ??
    new Map((publisherStore?.records ?? []).map((r) => [r.rvtr, r] as const));

  const context: PackageStageContext = { publisherByRvtr };
  const candidateRows = options.candidateRows ?? (await loadProductionCandidateRows());
  const items: ProductionQueueItem[] = [];
  let rowsScanned = 0;

  for (const row of candidateRows) {
    if (options.excludeRvtrs?.has(row.rvtr)) continue;

    rowsScanned += 1;

    const stage = await assessPackagePipelineStage(row.rvtr, context);
    if (!options.force && !stage.needsRun) continue;

    items.push({
      rvtr: row.rvtr,
      artist: row.artist,
      title: row.title,
      playCount: row.playCount,
      reason: options.force ? "Forced reprocess" : stage.reason,
      filePath: row.filePath,
    });

    if (options.limit > 0 && items.length >= options.limit) break;
  }

  return {
    items,
    candidateRowCount: candidateRows.length,
    rowsScanned,
    publisherRecordCount: publisherByRvtr.size,
  };
}
