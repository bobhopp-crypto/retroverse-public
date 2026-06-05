import type { MatchStatus } from "@/lib/ops/reconciliation-model";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";

import type { RetroverseTagsSource } from "@/lib/ops/retroverse-tags/resolve";

import type { ReviewClassification } from "./review-types";
import type { YearReviewEnrichmentMetrics } from "./enrich-vdj-meta";
import type { ReviewOwnership } from "./ownership";
import type { YearWorkspaceKeyword } from "./vocabulary";

export type YearWorkspaceBucket =
  | "in_both"
  | "chart_only"
  | "vdj_only"
  | "review";

export type YearWorkspaceWorkflowAction = "acquire" | "skip" | "review";

export const YEAR_WORKSPACE_PANEL_PREVIEW = 25;

export type YearWorkspaceRow = {
  id: string;
  workspaceKey: string;
  bucket: YearWorkspaceBucket;
  artist: string;
  title: string;
  matchStatus: MatchStatus;
  peak: number | null;
  weeks: number | null;
  keywords: YearWorkspaceKeyword[];
  workflowAction: YearWorkspaceWorkflowAction | null;
  reviewReason: string | null;
  chartItemId: string | null;
  graphTrackId: number | null;
  rvtr: string | null;
  mediaId: number | null;
  vdjLabel: string | null;
  vdjYear: number | null;
  sourcePath: string | null;
  bestMatch: string | null;
  /** VDJ rotation / ranking signal (PlayCount in database.xml — not a factual usage count). */
  playCount: number | null;
  vdjUser2Raw: string | null;
  /** Canonical Retroverse Tags for this row's RVTR (display field). */
  historicalTags: RvTagId[];
  /** True when tags are a VDJ User2 import hint not yet saved on the RVTR. */
  historicalTagsFromVdj: boolean;
  classification: ReviewClassification;
  /** True when Class is suggested from rotation signal only (nothing persisted yet). */
  classificationAutoPromoted: boolean;
  vdjMatch: "matched" | "missing" | "review";
  ownership: ReviewOwnership;
  /** RVTR store is source of truth; VDJ is import-only until promoted. */
  retroverseTagsSource: RetroverseTagsSource;
};

export type YearWorkspaceStats = {
  billboardTotal: number;
  vdjTotal: number;
  inBoth: number;
  chartOnly: number;
  vdjOnly: number;
};

export type YearWorkspaceCompletion = {
  billboardTotal: number;
  matched: number;
  inBoth: number;
  missing: number;
  chartOnlyPending: number;
  tagged: number;
  reviewed: number;
  reviewQueue: number;
};

export type YearWorkspaceData = {
  year: number;
  /** Top-N pilot slice active for 1967 / 1978 / 1992. */
  pilotMode?: boolean;
  pilotTopN?: number | null;
  stats: YearWorkspaceStats;
  completion: YearWorkspaceCompletion;
  inBoth: YearWorkspaceRow[];
  chartOnly: YearWorkspaceRow[];
  vdjOnly: YearWorkspaceRow[];
  review: YearWorkspaceRow[];
  /** Flat Hot 100 review table (inBoth + chartOnly), peak order. */
  reviewRows: YearWorkspaceRow[];
  reviewMetrics: YearReviewEnrichmentMetrics;
};

export type YearWorkspaceCategoryId =
  | "songs"
  | "albums"
  | "commercials"
  | "tv_clips"
  | "bumpers"
  | "promos"
  | "events";

export const YEAR_WORKSPACE_CATEGORIES: {
  id: YearWorkspaceCategoryId;
  label: string;
}[] = [
  { id: "songs", label: "Songs" },
  { id: "albums", label: "Albums" },
  { id: "commercials", label: "Commercials" },
  { id: "tv_clips", label: "TV Clips" },
  { id: "bumpers", label: "Bumpers" },
  { id: "promos", label: "Promos" },
  { id: "events", label: "Events" },
];
