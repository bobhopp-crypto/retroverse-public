/** Shared song-row props — chart-history list contexts across Retroverse. */
export type ChartHistorySongRowData = {
  rvtr: string;
  title: string;
  trackHref: string;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartYear: number | null;
  firstChartDate?: string | null;
  inLibrary?: boolean;
  /** Optional override for album or neighborhood contexts. */
  metaLine?: string;
};
