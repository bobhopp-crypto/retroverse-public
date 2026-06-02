import type { YearWorkspaceCategoryId } from "../../types";

import { CURATED_1967 } from "./1967";
import type { CuratedRecommendation } from "../types";

const BY_YEAR: Record<number, Partial<Record<YearWorkspaceCategoryId, CuratedRecommendation[]>>> = {
  1967: CURATED_1967,
};

export function getCuratedPoolForYear(
  year: number,
  category: Exclude<YearWorkspaceCategoryId, "songs">,
): CuratedRecommendation[] {
  const yearSet = BY_YEAR[year];
  if (!yearSet) return [];
  return yearSet[category] ?? [];
}

export function hasCuratedProvider(year: number): boolean {
  return year in BY_YEAR;
}
