import type { ProductionItem } from "../production-types";
import type { CuratedRecommendation } from "./types";

export function curatedToProductionItem(
  rec: CuratedRecommendation,
  now: string,
): ProductionItem {
  return {
    id: rec.id,
    title: rec.title,
    subtitle: rec.sourceCategory.replaceAll("_", " "),
    description: rec.description,
    year: rec.year,
    sourceCategory: rec.sourceCategory,
    priority: rec.priority,
    status: "wanted",
    kind: "recommendation",
    section: "wanted",
    workflowAction: null,
    skipped: false,
    filename: null,
    dateAdded: null,
    recommendationId: null,
    selectedSourceId: null,
    sourceUrl: null,
    sourceType: null,
    attachedFilename: null,
    attachedFilepath: null,
    attachedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
