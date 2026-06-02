export type ChartOrbitTrackRef = {
  rvtr: string | null;
  graphTrackId: string;
  title: string;
  artistName: string;
};

export type ChartOrbitFocusStats = {
  peakPosition: number | null;
  totalChartWeeks: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
};

export type ChartOrbitNeighborRow = {
  neighborKey: string;
  rvtr: string | null;
  graphTrackId: string;
  title: string;
  artistName: string;
  peakPosition: number | null;
  totalChartWeeks: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
  weeksTogether: number;
  weeksOverlapping: number;
  frequency: number;
  avgProximity: number;
  minProximity: number;
  maxProximity: number;
  overlapPctOfNeighbor: number;
  overlapPctOfFocus: number;
  overlapFirstDate: string | null;
  overlapLastDate: string | null;
  playlistScore: number;
  fateLabel: string;
};

export type ChartOrbitWeekDetail = {
  chartDate: string;
  focusPosition: number;
  neighborPosition: number;
  proximity: number;
  neighborKey: string;
  neighborTitle: string;
  neighborArtist: string;
};

export type ChartOrbitReport = {
  generatedAt: string;
  focus: ChartOrbitTrackRef;
  focusStats: ChartOrbitFocusStats;
  totalChartWeeks: number;
  uniqueNeighbors: number;
  neighborRows: ChartOrbitNeighborRow[];
  weekDetails: ChartOrbitWeekDetail[];
};

export const CHART_ORBIT_DEMO_TRACKS = [
  { label: "When Doves Cry", query: "When Doves Cry" },
  { label: "Dreams", query: "Dreams", artistHint: "Fleetwood Mac" },
  { label: "Stayin' Alive", query: "Stayin' Alive" },
] as const;
