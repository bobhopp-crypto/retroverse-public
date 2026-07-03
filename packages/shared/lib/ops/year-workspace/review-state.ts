import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";

import { chartWorkspaceKey } from "./keys";
import type { YearWorkspaceStateFile } from "./state";
import type { ReviewClassification, YearReviewRecord } from "./review-types";
import { normalizeHistoricalTags } from "./review-types";

export type { ReviewClassification, YearReviewRecord } from "./review-types";
export {
  effectiveClassification,
  migrateReviews,
  needsReview,
  REVIEW_CLASSIFICATIONS,
} from "./review-types";

export function reviewForKey(
  state: YearWorkspaceStateFile,
  workspaceKey: string,
): YearReviewRecord | undefined {
  return state.reviews[workspaceKey];
}

/** Resolve review state: media key first, then legacy chart-track key for same graph link. */
export function reviewForVideoRow(
  state: YearWorkspaceStateFile,
  row: { workspaceKey: string; graphTrackId: number | null },
): YearReviewRecord | undefined {
  const direct = state.reviews[row.workspaceKey];
  if (direct) return direct;
  if (row.graphTrackId != null) {
    return state.reviews[chartWorkspaceKey(row.graphTrackId)];
  }
  return undefined;
}

export type ReviewRecordPatch = {
  classification?: ReviewClassification | null;
  classificationLocked?: boolean | null;
  historicalTags?: RvTagId[] | null;
};

function mergeReviewRecord(
  existing: YearReviewRecord | undefined,
  patch: ReviewRecordPatch,
): YearReviewRecord | null {
  const next: YearReviewRecord = { ...existing };

  if ("classification" in patch) {
    if (patch.classification == null) {
      delete next.classification;
    } else {
      next.classification = patch.classification;
    }
  }

  if ("classificationLocked" in patch) {
    if (patch.classificationLocked == null || patch.classificationLocked === false) {
      delete next.classificationLocked;
    } else {
      next.classificationLocked = true;
    }
  }

  if ("historicalTags" in patch) {
    const tags =
      patch.historicalTags == null
        ? []
        : normalizeHistoricalTags(patch.historicalTags);
    if (tags.length === 0) {
      delete next.historicalTags;
    } else {
      next.historicalTags = tags;
    }
  }

  if (
    next.classification == null &&
    !next.classificationLocked &&
    (next.historicalTags?.length ?? 0) === 0
  ) {
    return null;
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export function applyReviewPatch(
  state: YearWorkspaceStateFile,
  workspaceKey: string,
  patch: ReviewRecordPatch,
): YearWorkspaceStateFile {
  const merged = mergeReviewRecord(state.reviews[workspaceKey], patch);
  const reviews = { ...state.reviews };
  if (merged == null) {
    delete reviews[workspaceKey];
  } else {
    reviews[workspaceKey] = merged;
  }
  return {
    ...state,
    reviews,
    updatedAt: new Date().toISOString(),
  };
}

export function applyBulkClassification(
  state: YearWorkspaceStateFile,
  workspaceKeys: string[],
  classification: ReviewClassification,
): YearWorkspaceStateFile {
  const reviews = { ...state.reviews };
  const now = new Date().toISOString();
  for (const key of workspaceKeys) {
    if (!key.trim()) continue;
    reviews[key] = {
      ...reviews[key],
      classification,
      updatedAt: now,
    };
  }
  return {
    ...state,
    reviews,
    updatedAt: now,
  };
}

export async function saveYearReviewRecord(
  year: number,
  workspaceKey: string,
  patch: ReviewRecordPatch,
): Promise<YearWorkspaceStateFile> {
  const { loadYearWorkspaceState, persistYearWorkspaceState } = await import("./state");
  const state = await loadYearWorkspaceState(year);
  const next = applyReviewPatch(state, workspaceKey, patch);
  await persistYearWorkspaceState(next);
  return next;
}

export async function saveBulkClassification(
  year: number,
  workspaceKeys: string[],
  classification: ReviewClassification,
): Promise<YearWorkspaceStateFile> {
  const { loadYearWorkspaceState, persistYearWorkspaceState } = await import("./state");
  const state = await loadYearWorkspaceState(year);
  const next = applyBulkClassification(state, workspaceKeys, classification);
  await persistYearWorkspaceState(next);
  return next;
}
