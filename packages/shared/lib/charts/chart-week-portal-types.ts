import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

export type ChartWeekPortalRow = {
  position: number;
  trackId: string;
  rvtr: string | null;
  title: string;
  artistName: string;
  artistSlug: string;
  trackHref: string | null;
  artistHref: string | null;
  albumHref: string | null;
  coverUrl: string | null;
  /** Prior week chart position; null if new entry or unknown. */
  prevPosition: number | null;
  peakHot100: number | null;
  weeksOnChart: number;
  coverageStatus: TrackCoverageStatus;
};

export type ChartWeekPortalContext = {
  chartDate: string;
  chartLabel: string;
  previousChartDate: string | null;
  nextChartDate: string | null;
  /** Null when viewing the full chart (no focus query). */
  focusPosition: number | null;
  focusTrackId: string | null;
  focusTitle: string | null;
  focusArtist: string | null;
  rows: ChartWeekPortalRow[];
  rangeFrom: number;
  rangeTo: number;
  chartMin: number;
  chartMax: number;
};
