/** Shared song-row props for charted-song lists across Retroverse. */
export type RetroverseSongRowData = {
  rvtr: string;
  title: string;
  trackHref: string;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartYear: number | null;
  inLibrary: boolean;
};

export function peakJourneyFill(peak: number | null): number {
  if (peak == null || peak < 1 || peak > 100) return 0;
  return Math.round(((101 - peak) / 100) * 100);
}
