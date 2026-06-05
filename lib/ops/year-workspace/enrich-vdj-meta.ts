import { loadVdjMetaForPaths, type VdjTrackMeta } from "@/lib/ops/rvtags-review/vdj-lookup";
import {
  filterReviewUniverseTags,
  type RvTagId,
} from "@/lib/ops/rvtags-review/vocabulary";
import {
  rotationSuggestsCocktail,
  VDJ_ROTATION_COCKTAIL_THRESHOLD,
} from "./vdj-rotation-signal";

import {
  loadRetroverseTagsStore,
  tagsForRvtr,
  type RetroverseTagsStoreFile,
} from "@/lib/ops/retroverse-tags/store";
import { resolveRetroverseTags } from "@/lib/ops/retroverse-tags/resolve";
import {
  effectiveClassification,
  needsReview as rowNeedsReview,
  type ReviewClassification,
} from "./review-types";
import { ownershipForRow } from "./ownership";
import { reviewForKey, reviewForVideoRow } from "./review-state";
import type { YearWorkspaceStateFile } from "./state";
import type { YearWorkspaceRow } from "./types";

function normPath(p: string | null | undefined): string | null {
  if (!p?.trim()) return null;
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

export type YearReviewEnrichmentMetrics = {
  chartRows: number;
  vdjPathsRequested: number;
  vdjPathsResolved: number;
  playCountKnown: number;
  playCountGte5: number;
  autoPromotedCocktail: number;
  classificationFill: number;
  classificationCocktail: number;
  classificationDance: number;
  classificationSlow: number;
  needsReview: number;
  /** Tags saved on RVTR (canonical store). */
  retroverseTagsCanonical: number;
  /** Tags still on legacy year-review record (transitional). */
  retroverseTagsLegacyReview: number;
  /** Tags shown from VDJ User2 import hints only. */
  retroverseTagsVdjImport: number;
};

export type YearReviewRowEnrichment = {
  playCount: number | null;
  vdjUser2Raw: string | null;
  historicalTags: RvTagId[];
  historicalTagsFromVdj: boolean;
  classification: ReviewClassification;
  classificationAutoPromoted: boolean;
  vdjMatch: "matched" | "missing" | "review";
};

function vdjMatchForRow(row: YearWorkspaceRow): YearReviewRowEnrichment["vdjMatch"] {
  if (row.bucket === "chart_only" || row.matchStatus === "missing") return "missing";
  if (row.matchStatus === "needs_review" || row.matchStatus === "possible_match") {
    return "review";
  }
  if (row.bucket === "in_both" || row.matchStatus === "matched") return "matched";
  return "review";
}

function enrichOneRow(
  row: YearWorkspaceRow,
  vdjByPath: Map<string, VdjTrackMeta>,
  reviewState: YearWorkspaceStateFile,
  tagStore: RetroverseTagsStoreFile,
): YearWorkspaceRow {
  const pathKey = normPath(row.sourcePath);
  const vdj = pathKey ? vdjByPath.get(pathKey) : undefined;
  const playCount = vdj?.playCount ?? null;
  const user2Raw = vdj?.user2?.trim() ? vdj.user2.trim() : null;

  const record = reviewForVideoRow(reviewState, row);
  const classification = effectiveClassification(record, playCount);
  const classificationAutoPromoted =
    record?.classification == null &&
    !record?.classificationLocked &&
    rotationSuggestsCocktail(playCount);

  const resolved = resolveRetroverseTags({
    canonicalTags: tagsForRvtr(tagStore, row.rvtr),
    legacyReviewTags: record?.historicalTags ?? [],
    vdjUser2Raw: user2Raw ?? "",
  });
  const historicalTags = filterReviewUniverseTags(resolved.tags);

  const enriched = {
    ...row,
    playCount,
    vdjUser2Raw: user2Raw,
    historicalTags,
    historicalTagsFromVdj: resolved.pendingCanonicalSave,
    classification,
    classificationAutoPromoted,
    vdjMatch: vdjMatchForRow(row),
    retroverseTagsSource: resolved.source,
  };

  return {
    ...enriched,
    ownership: ownershipForRow(enriched),
  };
}

export async function loadVdjMetaIndexForPaths(
  paths: Array<string | null | undefined>,
): Promise<Map<string, VdjTrackMeta>> {
  const unique = [
    ...new Set(
      paths.map(normPath).filter((p): p is string => p != null && p.length > 0),
    ),
  ];
  return loadVdjMetaForPaths(unique);
}

export async function enrichYearWorkspaceRows(
  rows: YearWorkspaceRow[],
  reviewState: YearWorkspaceStateFile,
): Promise<{ rows: YearWorkspaceRow[]; metrics: YearReviewEnrichmentMetrics }> {
  const [vdjByPath, tagStore] = await Promise.all([
    loadVdjMetaIndexForPaths(rows.map((r) => r.sourcePath)),
    loadRetroverseTagsStore(),
  ]);
  const enriched = rows.map((row) => enrichOneRow(row, vdjByPath, reviewState, tagStore));

  const metrics: YearReviewEnrichmentMetrics = {
    chartRows: enriched.length,
    vdjPathsRequested: new Set(
      rows.map((r) => normPath(r.sourcePath)).filter(Boolean),
    ).size,
    vdjPathsResolved: vdjByPath.size,
    playCountKnown: 0,
    playCountGte5: 0,
    autoPromotedCocktail: 0,
    classificationFill: 0,
    classificationCocktail: 0,
    classificationDance: 0,
    classificationSlow: 0,
    needsReview: 0,
    retroverseTagsCanonical: 0,
    retroverseTagsLegacyReview: 0,
    retroverseTagsVdjImport: 0,
  };

  for (const row of enriched) {
    if (row.playCount != null) {
      metrics.playCountKnown += 1;
      if (row.playCount >= VDJ_ROTATION_COCKTAIL_THRESHOLD) metrics.playCountGte5 += 1;
    }
    if (row.classificationAutoPromoted) metrics.autoPromotedCocktail += 1;
    if (row.classification === "Fill") metrics.classificationFill += 1;
    else if (row.classification === "Cocktail") metrics.classificationCocktail += 1;
    else if (row.classification === "Dance") metrics.classificationDance += 1;
    else if (row.classification === "Slow") metrics.classificationSlow += 1;

    const record = reviewForVideoRow(reviewState, row);
    if (rowNeedsReview(record, row.playCount ?? null)) metrics.needsReview += 1;
    if (row.retroverseTagsSource === "canonical") metrics.retroverseTagsCanonical += 1;
    else if (row.retroverseTagsSource === "legacy_review") {
      metrics.retroverseTagsLegacyReview += 1;
    } else if (row.retroverseTagsSource === "vdj_import") {
      metrics.retroverseTagsVdjImport += 1;
    }
  }

  return { rows: enriched, metrics };
}

export function buildReviewRows(
  inBoth: YearWorkspaceRow[],
  chartOnly: YearWorkspaceRow[],
): YearWorkspaceRow[] {
  const rows = [...inBoth, ...chartOnly];
  rows.sort((a, b) => {
    const pa = a.peak ?? 999;
    const pb = b.peak ?? 999;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  });
  return rows;
}

export type YearReviewApiMetrics = {
  matchedRows: number;
  missingRows: number;
  playCountRows: number;
  needsReviewRows: number;
};

export function computeReviewApiMetrics(
  reviewRows: YearWorkspaceRow[],
  reviewState: YearWorkspaceStateFile,
): YearReviewApiMetrics {
  let matchedRows = 0;
  let missingRows = 0;
  let playCountRows = 0;
  let needsReviewRows = 0;

  for (const row of reviewRows) {
    if (row.vdjMatch === "matched") matchedRows += 1;
    if (row.vdjMatch === "missing") missingRows += 1;
    if (row.playCount != null) playCountRows += 1;
    const record = reviewForVideoRow(reviewState, row);
    if (rowNeedsReview(record, row.playCount)) needsReviewRows += 1;
  }

  return { matchedRows, missingRows, playCountRows, needsReviewRows };
}
