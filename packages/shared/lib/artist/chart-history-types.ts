export type ChartHistoryEntry = {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  chartDate: string;
  year: number;
  month: number;
  peakPosition: number;
  weeksOnChart: number;
  chartName: string;
  coverUrl: string | null;
  /** Album release year (Album 200 rows). */
  releaseYear?: number | null;
};

export type ArtistChartHistory = {
  /** Collapsed chart runs (month cards / legacy). */
  entries: ChartHistoryEntry[];
  /** Raw weekly chart rows for RV Week snapshots. */
  weeklyEntries?: ChartHistoryEntry[];
  activeYears: number[];
};

export type RvChartSnapshot = {
  id: string;
  trackId: string;
  chartDate: string;
  year: number;
  month: number;
  chartName: string;
  chartDisplayName: string;
  peakPosition: number;
  title: string;
  artist: string;
  coverUrl: string | null;
  releaseYear?: number | null;
  /** Consecutive weeks at #1 for this leader run (when collapsed for display). */
  numberOneWeeks?: number;
  /** First chart date of the #1 run (ISO YYYY-MM-DD). */
  numberOneStartDate?: string;
  /** Last chart date of the #1 run (ISO YYYY-MM-DD). */
  numberOneEndDate?: string;
};
