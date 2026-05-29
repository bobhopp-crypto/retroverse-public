import type { MatchStatus } from "@/lib/ops/reconciliation-model";

import type { YearWorkspaceKeyword } from "./vocabulary";

export type YearWorkspaceBucket = "in_both" | "chart_only" | "vdj_only";

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

export type YearWorkspaceData = {
  year: number;
  stats: YearWorkspaceStats;
  inBoth: YearWorkspaceRow[];
  chartOnly: YearWorkspaceRow[];
  vdjOnly: YearWorkspaceRow[];
};
