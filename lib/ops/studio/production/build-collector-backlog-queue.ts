import "server-only";

import { existsSync, readdirSync } from "fs";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import { researchDepartmentRoot } from "@/lib/studio/package";

import { assessPackagePipelineStage } from "./package-stage";
import type { ProductionQueueBuildResult, ProductionQueueItem } from "./queue";

const RVTR_DIR = /^RVTR\d{6}$/i;

export type CollectorBacklogQueueOptions = {
  limit: number;
  force?: boolean;
  excludeRvtrs?: Set<string>;
  publisherByRvtr: Map<string, PublisherRecord>;
  /** Play count for ordering — higher first when present. */
  playCountByRvtr?: Map<string, number>;
};

/** Queue from on-disk Collector packages — not VDJ play-count selection. */
export async function buildCollectorBacklogQueue(
  options: CollectorBacklogQueueOptions,
): Promise<ProductionQueueBuildResult> {
  const root = researchDepartmentRoot();
  let dirNames: string[];
  try {
    dirNames = readdirSync(root).filter((name) => RVTR_DIR.test(name));
  } catch {
    return {
      items: [],
      candidateRowCount: 0,
      rowsScanned: 0,
      publisherRecordCount: options.publisherByRvtr.size,
    };
  }

  const context = { publisherByRvtr: options.publisherByRvtr };
  const eligible: ProductionQueueItem[] = [];
  let rowsScanned = 0;

  for (const name of dirNames) {
    const rvtr = name.toUpperCase();
    if (options.excludeRvtrs?.has(rvtr)) continue;
    if (!existsSync(collectorOutputPath(rvtr))) continue;

    rowsScanned += 1;
    const stage = await assessPackagePipelineStage(rvtr, context);
    if (!options.force && !stage.needsRun) continue;

    const collector = await loadCollectorPackage(rvtr);
    eligible.push({
      rvtr,
      artist: collector?.artist ?? rvtr,
      title: collector?.title ?? rvtr,
      playCount: options.playCountByRvtr?.get(rvtr) ?? 0,
      reason: options.force ? "Collector backlog — forced reprocess" : stage.reason,
      filePath: null,
    });
  }

  eligible.sort((a, b) => b.playCount - a.playCount || a.rvtr.localeCompare(b.rvtr));

  const items =
    options.limit > 0 && eligible.length > options.limit ? eligible.slice(0, options.limit) : eligible;

  return {
    items,
    candidateRowCount: dirNames.length,
    rowsScanned,
    publisherRecordCount: options.publisherByRvtr.size,
  };
}
