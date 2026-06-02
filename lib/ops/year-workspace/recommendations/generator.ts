import type { YearWorkspaceCategoryId } from "../types";

import { getCuratedPoolForYear } from "./providers";
import type { CuratedRecommendation } from "./types";
import { RECOMMENDATIONS_BATCH_SIZE } from "./types";

export function sortCuratedPool(pool: CuratedRecommendation[]): CuratedRecommendation[] {
  return [...pool].sort(
    (a, b) => a.priority - b.priority || a.title.localeCompare(b.title),
  );
}

export function pickNextCuratedRecommendations(
  year: number,
  category: Exclude<YearWorkspaceCategoryId, "songs">,
  existingIds: Set<string>,
  limit = RECOMMENDATIONS_BATCH_SIZE,
): CuratedRecommendation[] {
  const pool = sortCuratedPool(getCuratedPoolForYear(year, category));
  return pool.filter((rec) => !existingIds.has(rec.id)).slice(0, limit);
}

export function curatedPoolStats(
  year: number,
  category: Exclude<YearWorkspaceCategoryId, "songs">,
  existingIds: Set<string>,
): { total: number; remaining: number } {
  const pool = getCuratedPoolForYear(year, category);
  const remaining = pool.filter((rec) => !existingIds.has(rec.id)).length;
  return { total: pool.length, remaining };
}
