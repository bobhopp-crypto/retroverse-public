import type {
  CategorySectionCounts,
  YearWorkspaceProductionState,
} from "./production-types";
import { sectionCounts } from "./production-utils";
import type { YearWorkspaceCategoryId, YearWorkspaceCompletion } from "./types";
import { YEAR_WORKSPACE_CATEGORIES } from "./types";
export type ShowReadiness = {
  year: number;
  targetAssets: number;
  approvedAssets: number;
  percent: number;
  byCategory: Record<YearWorkspaceCategoryId, CategorySectionCounts>;
};

function songsCountsFromCompletion(
  completion: YearWorkspaceCompletion,
): CategorySectionCounts {
  return {
    wanted: completion.chartOnlyPending,
    queued: 0,
    acquired: completion.inBoth,
    approved: completion.tagged,
  };
}

function countsWithQueued(
  production: YearWorkspaceProductionState,
  category: YearWorkspaceCategoryId,
  songsCompletion?: YearWorkspaceCompletion,
): CategorySectionCounts {
  if (category === "songs" && songsCompletion) {
    return songsCountsFromCompletion(songsCompletion);
  }
  return sectionCounts(production[category]);
}

export function computeShowReadiness(
  year: number,
  production: YearWorkspaceProductionState,
  songsCompletion?: YearWorkspaceCompletion,
): ShowReadiness {
  const byCategory = {} as Record<YearWorkspaceCategoryId, CategorySectionCounts>;
  let targetAssets = 0;
  let approvedAssets = 0;

  for (const { id } of YEAR_WORKSPACE_CATEGORIES) {
    const counts = countsWithQueued(production, id, songsCompletion);
    byCategory[id] = counts;
    const target =
      counts.wanted + counts.queued + counts.acquired + counts.approved;
    targetAssets += target;
    approvedAssets += counts.approved;
  }

  const percent =
    targetAssets > 0 ? Math.round((approvedAssets / targetAssets) * 100) : 0;

  return { year, targetAssets, approvedAssets, percent, byCategory };
}
