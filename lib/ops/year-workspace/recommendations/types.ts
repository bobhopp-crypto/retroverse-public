import type { YearWorkspaceCategoryId } from "../types";
import type { ProductionSection } from "../production-types";

/** Curated planning record — local dataset, no network. */
export type CuratedRecommendation = {
  id: string;
  title: string;
  description: string;
  year: number;
  sourceCategory: string;
  /** 1 = highest planning priority */
  priority: 1 | 2 | 3 | 4 | 5;
};

export type YearRecommendationProvider = Partial<
  Record<Exclude<YearWorkspaceCategoryId, "songs">, CuratedRecommendation[]>
>;

export const RECOMMENDATIONS_BATCH_SIZE = 25;

export type RecommendationItemStatus = ProductionSection;
