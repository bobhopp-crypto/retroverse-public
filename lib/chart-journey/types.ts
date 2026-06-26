import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

/** Future chart-week page hooks — populated when chart date APIs exist. */
export type ChartWeekContextHooks = {
  issueDate: string;
  rank: number;
  href: string;
  /** #1 song that week (future). */
  numberOne: { rvtr: string; title: string; artist: string } | null;
  /** Songs entering the chart that week (future). */
  entering: Array<{ rvtr: string; title: string; artist: string }> | null;
  /** Songs leaving the chart that week (future). */
  leaving: Array<{ rvtr: string; title: string; artist: string }> | null;
  /** Nearby chart neighbors (future). */
  neighbors: Array<{ rvtr: string; title: string; artist: string; rank: number }> | null;
  /** Biggest movers that week (future). */
  movers: Array<{ rvtr: string; title: string; artist: string; delta: number }> | null;
};

export type ChartJourneyRun = {
  runIndex: number;
  startDate: string;
  endDate: string;
  weekCount: number;
  peakRank: number;
  reentry: boolean;
  weeksAbsent: number;
  weeks: TrackTrajectoryWeek[];
};

export type ChartJourneyBadge = "NEW" | "PEAK" | "RETURN" | "BIG JUMP" | "FINAL WEEK";

export type ChartJourneyMetrics = {
  peakPosition: number | null;
  weeksOnChart: number;
  weeksInTop10: number;
  weeksAtNumberOne: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
  longestUninterruptedRun: number;
  longestClimbStreak: number;
  longestDeclineStreak: number;
  chartRunCount: number;
  reEntryCount: number;
  biggestWeeklyClimb: number | null;
  biggestWeeklyDrop: number | null;
  returnedAfterFalloffWeeks: number | null;
};

export type ChartJourneyRowDetail = {
  date: string;
  chartPosition: number;
  weekNumber: number;
  weeksRemaining: number;
  movementFromPrevious: number | null;
  movementToNext: number | null;
  badges: ChartJourneyBadge[];
  milestoneLabel: string | null;
};

export type ChartJourneyRow = {
  week: TrackTrajectoryWeek;
  weekIndex: number;
  barWidthPct: number;
  heatBand: "numberOne" | "top10" | "top20" | "top40" | "hot100";
  barColor: string;
  dateLabel: string;
  weekNumber: number;
  badges: ChartJourneyBadge[];
  detail: ChartJourneyRowDetail;
  context: ChartWeekContextHooks;
};

export type ChartJourneyGap = {
  kind: "reentry";
  afterRunIndex: number;
  weeksAbsent: number;
  returnDate: string;
};

export type ChartJourneyMilestone = {
  id: string;
  date: string;
  label: string;
  kind:
    | "certification"
    | "award"
    | "tour"
    | "anniversary"
    | "catalog_resurgence"
    | "artist_death_rebound"
    | "box_set"
    | "reissue"
    | "other";
};

export type ChartJourneyModel = {
  chartLabel: string;
  maxRank: number;
  metrics: ChartJourneyMetrics;
  runs: ChartJourneyRun[];
  rows: ChartJourneyRow[];
  gaps: ChartJourneyGap[];
  milestones: ChartJourneyMilestone[];
};

export type ChartJourneySummary = {
  peakPosition: number | null;
  weeksOnChart: number;
  chartRunCount: number;
  reEntryCount: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
  biggestWeeklyClimb: number | null;
  biggestWeeklyDrop: number | null;
};
