/** Lightweight reconciliation model — chart universe + VDJ owned-media overlay. */

export type MatchStatus =
  | "matched"
  | "possible_match"
  | "missing"
  | "needs_review"
  | "ignored";

export type AcquisitionStatus =
  | "queued"
  | "searching"
  | "downloaded"
  | "skipped"
  | "unavailable"
  | "none";

/**
 * Explicit year semantics for reconciliation.
 * `chartYear` is authoritative for ops universe / completion (Billboard chart_date).
 */
export type ReconciliationYears = {
  chartYear: number;
  releaseYear: number | null;
  vdjYear: number | null;
  performanceYear: number | null;
  editorialYear: number | null;
};

/** Chart-side identity (Billboard / Retroverse graph). */
export type ChartItem = ReconciliationYears & {
  chartItemId: string;
  graphTrackId: number | null;
  rvtr: string | null;
  artist: string;
  title: string;
  /** Billboard chart universe year — alias of `chartYear` (do not use VDJ year here). */
  year: number;
  chartSource: string;
  peak: number | null;
  weeks: number;
  importanceScore: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
};

/** VDJ / local playable inventory overlay. */
export type OwnedMedia = {
  mediaId: number | null;
  label: string | null;
  hasVdjMedia: boolean;
  hasVideo: boolean;
  hasR2: boolean;
  sourcePath: string | null;
};

/** Reconciliation link between chart item and owned media. */
export type MatchRecord = {
  matchStatus: MatchStatus;
  confidence: "high" | "medium" | "low" | "none";
  bestMatch: string | null;
  manualOverride: boolean;
  notes: string | null;
};

export type YearMatchRow = ChartItem &
  OwnedMedia &
  MatchRecord & {
    id: string;
    displayRank: number | null;
  };

export type AcquisitionRow = {
  id: string;
  chartItemId: string;
  artist: string;
  title: string;
  year: number;
  priority: "high" | "medium" | "low";
  peak: number | null;
  acquisitionStatus: AcquisitionStatus;
  rvtr: string | null;
};

export type WeeklyRefreshStatus = {
  lastVdjSnapshot: string | null;
  newVideosDetected: number;
  metadataChanges: number;
  missingR2Uploads: number;
  unmatchedMedia: number;
  lastRefreshResult: "ok" | "warn" | "stub";
  lastRefreshNote: string;
};
