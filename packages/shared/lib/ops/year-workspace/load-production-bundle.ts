import type {
  CategorySectionCounts,
  YearWorkspaceProductionBundle,
} from "./production-types";
import {
  buildProductionSummary,
  loadYearProductionState,
} from "./production-state";
import { computeShowReadiness } from "./show-readiness";
import type { YearWorkspaceCompletion } from "./types";

export function songsSummaryFromCompletion(
  completion: YearWorkspaceCompletion,
): CategorySectionCounts {
  return {
    wanted: completion.chartOnlyPending,
    queued: 0,
    acquired: completion.inBoth,
    approved: completion.tagged,
  };
}

export async function loadYearWorkspaceProductionBundleForYear(
  year: number,
  completion: YearWorkspaceCompletion,
): Promise<YearWorkspaceProductionBundle> {
  const production = await loadYearProductionState(year);
  const summary = buildProductionSummary(
    production,
    songsSummaryFromCompletion(completion),
  );
  const readiness = computeShowReadiness(year, production, completion);
  return {
    production,
    summary,
    showReadiness: {
      year: readiness.year,
      targetAssets: readiness.targetAssets,
      approvedAssets: readiness.approvedAssets,
      percent: readiness.percent,
    },
  };
}
