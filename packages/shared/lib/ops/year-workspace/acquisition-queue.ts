import { randomUUID } from "crypto";

import { logicalIncomingPath } from "./paths";
import type { CategoryProductionFile, ProductionItem } from "./production-types";
import {
  loadCategoryProduction,
  persistCategoryProduction,
} from "./production-state";
import type { SourceCandidate } from "./source-discovery/types";
import { updateSourceCandidateStatus } from "./source-discovery/source-state";
import type { YearWorkspaceCategoryId } from "./types";

export async function enqueueFromSelectedSource(
  year: number,
  category: YearWorkspaceCategoryId,
  recommendation: ProductionItem,
  source: SourceCandidate,
): Promise<CategoryProductionFile> {
  if (recommendation.kind !== "recommendation") {
    throw new Error("Only recommendations enter the acquisition queue");
  }

  await updateSourceCandidateStatus(
    year,
    category,
    recommendation.id,
    source.id,
    "selected",
  );

  const file = await loadCategoryProduction(year, category);
  const dup = file.items.some(
    (i) =>
      i.kind === "queue_entry" &&
      i.selectedSourceId === source.id &&
      !i.skipped,
  );
  if (dup) return file;

  const now = new Date().toISOString();
  file.items.push({
    id: `queue-${randomUUID()}`,
    title: recommendation.title,
    subtitle: source.title,
    description: recommendation.description,
    year: recommendation.year,
    sourceCategory: recommendation.sourceCategory,
    priority: recommendation.priority,
    status: "queued",
    kind: "queue_entry",
    section: "queued",
    workflowAction: null,
    skipped: false,
    filename: null,
    dateAdded: now,
    recommendationId: recommendation.id,
    selectedSourceId: source.id,
    sourceUrl: source.url,
    sourceType: source.sourceType,
    attachedFilename: null,
    attachedFilepath: null,
    attachedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return persistCategoryProduction(file);
}

export async function rejectSourceCandidate(
  year: number,
  category: YearWorkspaceCategoryId,
  recommendationId: string,
  sourceId: string,
): Promise<void> {
  await updateSourceCandidateStatus(
    year,
    category,
    recommendationId,
    sourceId,
    "rejected",
  );
}

export async function attachAssetToQueueItem(
  year: number,
  category: YearWorkspaceCategoryId,
  queueItemId: string,
  filename: string,
): Promise<CategoryProductionFile> {
  const trimmed = filename.trim();
  if (!trimmed) throw new Error("filename required");

  const file = await loadCategoryProduction(year, category);
  const item = file.items.find((i) => i.id === queueItemId);
  if (!item || item.kind !== "queue_entry") {
    throw new Error("Queue item not found");
  }

  const now = new Date().toISOString();
  item.attachedFilename = trimmed;
  item.attachedFilepath = logicalIncomingPath(year, category, trimmed);
  item.attachedAt = now;
  item.updatedAt = now;

  return persistCategoryProduction(file);
}
