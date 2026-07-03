import { suggestedClassFromRotation } from "./vdj-rotation-signal";
import { enrichYearWorkspaceRows } from "./enrich-vdj-meta";
import { loadVideoUniverse } from "./load-video-universe";
import { applyReviewPatch } from "./review-state";
import type { ReviewClassification } from "./review-types";
import { REVIEW_CLASSIFICATIONS } from "./review-types";
import { loadYearWorkspaceState, persistYearWorkspaceState } from "./state";
import type { YearWorkspaceRow } from "./types";

export type ClassificationCounts = Record<ReviewClassification, number>;

export function emptyClassificationCounts(): ClassificationCounts {
  return { Fill: 0, Cocktail: 0, Dance: 0, Slow: 0 };
}

export function countClassifications(rows: YearWorkspaceRow[]): ClassificationCounts {
  const counts = emptyClassificationCounts();
  for (const row of rows) {
    counts[row.classification] += 1;
  }
  return counts;
}

/** Suggested initial Class from VDJ rotation signal — not a factual play count. */
export function initialClassificationForPlayCount(
  playCount: number | null,
): ReviewClassification {
  return suggestedClassFromRotation(playCount);
}

export type InitClassificationResult = {
  year: number;
  total: number;
  persisted: number;
  counts: ClassificationCounts;
};

/**
 * Persist suggested Fill/Cocktail from VDJ rotation signal (init only).
 * Does not modify tags or matching. Preserves no Dance/Slow — all rows reset to Fill/Cocktail.
 */
export async function initializeVideoUniverseClassification(
  year: number,
): Promise<InitClassificationResult> {
  let state = await loadYearWorkspaceState(year);
  const bundle = await loadVideoUniverse(year, state);
  const { rows } = await enrichYearWorkspaceRows(bundle.reviewRows, state);

  let persisted = 0;
  for (const row of rows) {
    const classification = initialClassificationForPlayCount(row.playCount);
    state = applyReviewPatch(state, row.workspaceKey, {
      classification,
      classificationLocked: null,
    });
    persisted += 1;
  }

  await persistYearWorkspaceState(state);

  const refreshed = await loadVideoUniverse(year, state);
  const { rows: finalRows } = await enrichYearWorkspaceRows(refreshed.reviewRows, state);

  return {
    year,
    total: finalRows.length,
    persisted,
    counts: countClassifications(finalRows),
  };
}

export function formatClassificationCounts(counts: ClassificationCounts): string {
  return REVIEW_CLASSIFICATIONS.map((c) => `${c}: ${counts[c]}`).join(" · ");
}
