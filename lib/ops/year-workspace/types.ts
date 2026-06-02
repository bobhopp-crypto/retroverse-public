import type { MatchStatus } from "@/lib/ops/reconciliation-model";

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
  stats: YearWorkspaceStats;
  completion: YearWorkspaceCompletion;
  inBoth: YearWorkspaceRow[];
  chartOnly: YearWorkspaceRow[];
  vdjOnly: YearWorkspaceRow[];
  review: YearWorkspaceRow[];
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
  active: boolean;
}[] = [
  { id: "songs", label: "Songs", active: true },
  { id: "albums", label: "Albums", active: false },
  { id: "commercials", label: "Commercials", active: false },
  { id: "tv_clips", label: "TV Clips", active: false },
  { id: "bumpers", label: "Bumpers", active: false },
  { id: "promos", label: "Promos", active: false },
  { id: "events", label: "Events", active: false },
];
