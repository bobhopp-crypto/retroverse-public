import { loadYearMatchSection } from "@/lib/ops/load-year-match-section";
import {
  loadChartTrackIdsInPerformanceUniverse,
  loadVdjPerformanceUniverse,
} from "@/lib/ops/load-vdj-performance-universe";
import type { YearMatchRow } from "@/lib/ops/reconciliation-model";

import { buildReviewRows } from "./year-workspace/enrich-vdj-meta";
import type { YearReviewEnrichmentMetrics } from "./year-workspace/enrich-vdj-meta";
import { normalizeGraphTrackId } from "./year-workspace/graph-track-id";
import { chartWorkspaceKey, mediaWorkspaceKey } from "./year-workspace/keys";
import {
  chartActionForKey,
  keywordsForKey,
  loadYearWorkspaceState,
} from "./year-workspace/state";
import type {
  YearWorkspaceCompletion,
  YearWorkspaceData,
  YearWorkspaceRow,
  YearWorkspaceWorkflowAction,
} from "./year-workspace/types";

const EMPTY_REVIEW_FIELDS: Pick<
  YearWorkspaceRow,
  | "playCount"
  | "vdjUser2Raw"
  | "historicalTags"
  | "historicalTagsFromVdj"
  | "classification"
  | "classificationAutoPromoted"
  | "vdjMatch"
  | "ownership"
  | "retroverseTagsSource"
> = {
  playCount: null,
  vdjUser2Raw: null,
  historicalTags: [],
  historicalTagsFromVdj: false,
  classification: "Fill",
  classificationAutoPromoted: false,
  vdjMatch: "missing",
  ownership: "missing",
  retroverseTagsSource: "none",
};

const EMPTY_REVIEW_METRICS: YearReviewEnrichmentMetrics = {
  chartRows: 0,
  vdjPathsRequested: 0,
  vdjPathsResolved: 0,
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

function chartRowToWorkspace(
  row: YearMatchRow,
  bucket: "in_both" | "chart_only",
  keywords: YearWorkspaceRow["keywords"],
  workflowAction: YearWorkspaceWorkflowAction | null,
): YearWorkspaceRow {
  const graphTrackId = normalizeGraphTrackId(row.graphTrackId);
  const workspaceKey = chartWorkspaceKey(graphTrackId!);
  return {
    id: `ws-${row.id}`,
    workspaceKey,
    bucket,
    artist: row.artist,
    title: row.title,
    matchStatus: row.matchStatus,
    peak: row.peak,
    weeks: row.weeks,
    keywords,
    workflowAction,
    reviewReason: null,
    chartItemId: row.chartItemId,
    graphTrackId,
    rvtr: row.rvtr,
    mediaId: row.mediaId,
    vdjLabel: row.bestMatch ?? row.label,
    vdjYear: row.vdjYear,
    sourcePath: null,
    bestMatch: row.bestMatch,
    ...EMPTY_REVIEW_FIELDS,
    vdjMatch: bucket === "in_both" ? "matched" : "missing",
  };
}

export async function loadYearWorkspace(year: number): Promise<YearWorkspaceData> {
  const [chartRows, vdjRows, keywordState] = await Promise.all([
    loadYearMatchSection(year),
    loadVdjPerformanceUniverse(year),
    loadYearWorkspaceState(year),
  ]);

  const graphTrackIds = chartRows
    .map((r) => normalizeGraphTrackId(r.graphTrackId))
    .filter((id): id is number => id != null);
  const chartTrackIdSet = new Set(graphTrackIds);
  const inPerformanceUniverse = await loadChartTrackIdsInPerformanceUniverse(
    year,
    graphTrackIds,
  );

  const inBoth: YearWorkspaceRow[] = [];
  const chartOnly: YearWorkspaceRow[] = [];

  for (const row of chartRows) {
    const graphTrackId = normalizeGraphTrackId(row.graphTrackId);
    if (graphTrackId == null) continue;
    const inPerf = inPerformanceUniverse.has(graphTrackId);
    const key = chartWorkspaceKey(graphTrackId);
    const keywords = keywordsForKey(keywordState, key);
    const workflowAction = chartActionForKey(keywordState, key);
    if (inPerf) {
      inBoth.push(chartRowToWorkspace(row, "in_both", keywords, workflowAction));
    } else {
      chartOnly.push(chartRowToWorkspace(row, "chart_only", keywords, workflowAction));
    }
  }

  const vdjOnly: YearWorkspaceRow[] = [];
  for (const media of vdjRows) {
    const mediaGraphId = normalizeGraphTrackId(media.graphTrackId);
    if (mediaGraphId != null && chartTrackIdSet.has(mediaGraphId)) {
      continue;
    }
    const workspaceKey = mediaWorkspaceKey(media.mediaId);
    vdjOnly.push({
      id: `ws-media-${media.mediaId}`,
      workspaceKey,
      bucket: "vdj_only",
      artist: media.artist,
      title: media.title,
      matchStatus: "missing",
      peak: null,
      weeks: null,
      keywords: keywordsForKey(keywordState, workspaceKey),
      chartItemId: null,
      graphTrackId: mediaGraphId,
      workflowAction: null,
      reviewReason: null,
      rvtr: null,
      mediaId: media.mediaId,
      vdjLabel: media.label,
      vdjYear: media.vdjYear,
      sourcePath: media.sourcePath,
      bestMatch: media.label,
      ...EMPTY_REVIEW_FIELDS,
      vdjMatch: "review",
    });
  }

  const sortChart = (a: YearWorkspaceRow, b: YearWorkspaceRow) => {
    const pa = a.peak ?? 999;
    const pb = b.peak ?? 999;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  };

  inBoth.sort(sortChart);
  chartOnly.sort(sortChart);
  vdjOnly.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));

  const review = buildReviewQueue(inBoth, chartOnly, vdjOnly);
  const reviewRows = buildReviewRows(inBoth, chartOnly);
  const reviewMetrics: YearReviewEnrichmentMetrics = {
    ...EMPTY_REVIEW_METRICS,
    chartRows: reviewRows.length,
    classificationFill: reviewRows.length,
  };
  const completion = buildCompletion(chartRows, inBoth, chartOnly, keywordState, review.length);

  return {
    year,
    stats: {
      billboardTotal: chartRows.length,
      vdjTotal: vdjRows.length,
      inBoth: inBoth.length,
      chartOnly: chartOnly.length,
      vdjOnly: vdjOnly.length,
    },
    completion,
    inBoth,
    chartOnly,
    vdjOnly,
    review,
    reviewRows,
    reviewMetrics,
  };
}

function buildReviewQueue(
  inBoth: YearWorkspaceRow[],
  chartOnly: YearWorkspaceRow[],
  vdjOnly: YearWorkspaceRow[],
): YearWorkspaceRow[] {
  const review: YearWorkspaceRow[] = [];
  const seen = new Set<string>();

  const add = (row: YearWorkspaceRow, reason: string) => {
    if (seen.has(row.workspaceKey)) return;
    seen.add(row.workspaceKey);
    review.push({ ...row, bucket: "review", reviewReason: reason });
  };

  for (const row of chartOnly) {
    if (row.workflowAction === "skip") continue;
    if (!row.workflowAction) {
      add(row, "needs acquisition");
    } else if (row.workflowAction === "review") {
      add(row, "needs verification");
    } else if (row.workflowAction === "acquire") {
      add(row, "queued for acquisition");
    }
  }

  for (const row of inBoth) {
    if (row.keywords.length === 0) add(row, "needs tagging");
  }
  for (const row of vdjOnly) {
    if (row.keywords.length === 0) add(row, "needs tagging");
  }

  review.sort((a, b) => {
    const pa = a.peak ?? 999;
    const pb = b.peak ?? 999;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  });

  return review;
}

function buildCompletion(
  chartRows: YearMatchRow[],
  inBoth: YearWorkspaceRow[],
  chartOnly: YearWorkspaceRow[],
  keywordState: Awaited<ReturnType<typeof loadYearWorkspaceState>>,
  reviewQueue: number,
): YearWorkspaceCompletion {
  const matched = chartRows.filter((r) => r.matchStatus === "matched").length;
  const taggedKeys = new Set<string>();
  for (const row of [...inBoth, ...chartOnly]) {
    if (row.keywords.length > 0) taggedKeys.add(row.workspaceKey);
  }
  for (const [key, list] of Object.entries(keywordState.keywords)) {
    if ((list?.length ?? 0) > 0) taggedKeys.add(key);
  }

  return {
    billboardTotal: chartRows.length,
    matched,
    inBoth: inBoth.length,
    missing: chartRows.filter((r) => r.matchStatus === "missing").length,
    chartOnlyPending: chartOnly.filter((r) => !r.workflowAction).length,
    tagged: taggedKeys.size,
    reviewed: Object.keys(keywordState.chartActions).length,
    reviewQueue,
  };
}
