export type ChartWeekPortalRow = {
  position: number;
  trackId: string;
  rvtr: string | null;
  title: string;
  artistName: string;
  artistSlug: string;
  trackHref: string | null;
  artistHref: string;
  albumHref: string | null;
  coverUrl: string | null;
  /** Prior week chart position; null if new entry or unknown. */
  prevPosition: number | null;
  peakHot100: number | null;
  weeksOnChart: number;
};

export type ChartWeekPortalContext = {
  chartDate: string;
  chartLabel: string;
  focusPosition: number;
  focusTrackId: string | null;
  focusTitle: string | null;
  focusArtist: string | null;
  rows: ChartWeekPortalRow[];
  rangeFrom: number;
  rangeTo: number;
  chartMin: number;
  chartMax: number;
};
