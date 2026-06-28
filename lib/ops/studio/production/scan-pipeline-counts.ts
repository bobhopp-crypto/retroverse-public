import "server-only";

import { existsSync, readdirSync } from "fs";

import { creativeReviewOutputPath } from "@/lib/ops/studio/creative-review/paths";
import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import { directorRenderSpecPath } from "@/lib/ops/studio/director/paths";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import { isPublisherApproved } from "@/lib/ops/studio/publisher/store";
import { researchDepartmentRoot } from "@/lib/studio/package";

const RVTR_DIR = /^RVTR\d{6}$/i;

export type PipelineStageCounts = {
  scannedAt: string;
  totalPackageDirs: number;
  collectorComplete: number;
  editorComplete: number;
  directorComplete: number;
  creativeReviewComplete: number;
  published: number;
  /** Collector done but not yet published. */
  backlogRemaining: number;
  failedMarked: number;
};

/** Full research-department scan — sync FS for batch CLI performance. */
export function scanPipelineStageCounts(
  publisherByRvtr: Map<string, PublisherRecord>,
  failedRvtrs?: Set<string>,
): PipelineStageCounts {
  const root = researchDepartmentRoot();
  let totalPackageDirs = 0;
  let collectorComplete = 0;
  let editorComplete = 0;
  let directorComplete = 0;
  let creativeReviewComplete = 0;
  let published = 0;

  let dirs: string[];
  try {
    dirs = readdirSync(root);
  } catch {
    return {
      scannedAt: new Date().toISOString(),
      totalPackageDirs: 0,
      collectorComplete: 0,
      editorComplete: 0,
      directorComplete: 0,
      creativeReviewComplete: 0,
      published: 0,
      backlogRemaining: 0,
      failedMarked: failedRvtrs?.size ?? 0,
    };
  }

  for (const name of dirs) {
    if (!RVTR_DIR.test(name)) continue;
    const rvtr = name.toUpperCase();
    totalPackageDirs += 1;

    if (!existsSync(collectorOutputPath(rvtr))) continue;
    collectorComplete += 1;

    if (existsSync(editorOutputPath(rvtr))) editorComplete += 1;
    if (existsSync(directorRenderSpecPath(rvtr))) directorComplete += 1;
    if (existsSync(creativeReviewOutputPath(rvtr))) creativeReviewComplete += 1;

    const record = publisherByRvtr.get(rvtr);
    if (record && isPublisherApproved(record)) published += 1;
  }

  return {
    scannedAt: new Date().toISOString(),
    totalPackageDirs,
    collectorComplete,
    editorComplete,
    directorComplete,
    creativeReviewComplete,
    published,
    backlogRemaining: Math.max(0, collectorComplete - published),
    failedMarked: failedRvtrs?.size ?? 0,
  };
}

export function formatPipelineStageCounts(counts: PipelineStageCounts): string {
  return [
    `Collector complete: ${counts.collectorComplete}`,
    `Editor complete: ${counts.editorComplete}`,
    `Director complete: ${counts.directorComplete}`,
    `Creative Review complete: ${counts.creativeReviewComplete}`,
    `Published: ${counts.published}`,
    `Failed (this run): ${counts.failedMarked}`,
    `Remaining (collector done, not published): ${counts.backlogRemaining}`,
  ].join("\n");
}
