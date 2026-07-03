import type { ChartArchetype } from "@/lib/chart-journey/chart-archetype";
import type { ChartJourneyModel } from "@/lib/chart-journey/types";
import type { TrackPageData } from "@/lib/track/load-track-page";

/** Flagship Chart Journey chapter identifiers — optional, data-driven. */
export type ChartJourneyChapterId =
  | "opening"
  | "release"
  | "entered_charts"
  | "rapid_rise"
  | "top_40"
  | "top_10"
  | "peak_week"
  | "competition"
  | "longevity"
  | "international"
  | "awards"
  | "legacy";

export type ChartJourneyViewMode = "experience" | "timeline";

export type ChartJourneyMotionLanguage =
  | "vinyl_spin"
  | "line_draw"
  | "cover_slide"
  | "confetti_pulse"
  | "map_illuminate"
  | "calendar_flip"
  | "milestone_pulse"
  | "timeline_scroll"
  | "magazine_reveal"
  | "fade_up";

export type ChartJourneyVisualLanguage = {
  palette: string[];
  typography: { display: string; stat: string; body: string };
  texture: string;
  signature: string;
};

export type ChartJourneyChapterBase = {
  id: ChartJourneyChapterId;
  title: string;
  subtitle: string;
  visualConcept: string;
  motionConcept: ChartJourneyMotionLanguage;
  narrativeHook: string;
};

export type ChartJourneyOpeningPayload = {
  coverUrl: string | null;
  title: string;
  artist: string;
  releaseYear: number | null;
  label: string | null;
  archetype: ChartArchetype;
  openingLine: string;
};

export type ChartJourneyReleasePayload = {
  releaseDate: string | null;
  releaseYear: number | null;
  albumTitle: string | null;
  label: string | null;
};

export type ChartJourneyEnteredPayload = {
  debutRank: number;
  debutDate: string;
  chartLabel: string;
};

export type ChartJourneyRisePayload = {
  biggestClimb: number | null;
  climbWeeks: number;
  fromRank: number;
  toRank: number;
  highlightWeekIndex: number;
};

export type ChartJourneyPeakPayload = {
  peakRank: number;
  peakDate: string;
  weeksAtPeak: number;
  celebrationCopy: string;
};

export type ChartJourneyLongevityPayload = {
  weeksOnChart: number;
  reEntryCount: number;
  returnedAfterWeeks: number | null;
  lastChartDate: string | null;
};

export type ChartJourneyInternationalPayload = {
  regions: Array<{ code: string; label: string; tier: "top40" | "top10" | "number_one" | "mentioned" }>;
  summary: string;
};

export type ChartJourneyAwardsPayload = {
  milestones: Array<{ label: string; kind: "gold" | "platinum" | "grammy" | "hall_of_fame" | "riaa" | "other" }>;
};

export type ChartJourneyLegacyPayload = {
  headline: string;
  threads: string[];
};

export type ChartJourneyCompetitionPayload = {
  placeholder: true;
  note: string;
};

export type ChartJourneyChapterPayload =
  | ChartJourneyOpeningPayload
  | ChartJourneyReleasePayload
  | ChartJourneyEnteredPayload
  | ChartJourneyRisePayload
  | ChartJourneyPeakPayload
  | ChartJourneyLongevityPayload
  | ChartJourneyInternationalPayload
  | ChartJourneyAwardsPayload
  | ChartJourneyLegacyPayload
  | ChartJourneyCompetitionPayload;

export type ChartJourneyChapter = ChartJourneyChapterBase & {
  included: boolean;
  skipReason?: string;
  payload?: ChartJourneyChapterPayload;
  /** Primary week index in timeline — jump target for unified navigation */
  anchorWeekIndex?: number;
  /** Week range this chapter spans (inclusive) */
  weekRange?: [number, number];
};

/** Progressive enrichment slots — populate automatically as Retrograph grows. */
export type ChartJourneyWeekEnrichment = {
  billboardCover: string | null;
  topFiveThatWeek: Array<{ rank: number; title: string; artist: string }> | null;
  songsAboveBelow: {
    above: { rank: number; title: string; artist: string } | null;
    below: { rank: number; title: string; artist: string } | null;
  } | null;
  historicalEvents: string[] | null;
  tvAppearances: string[] | null;
  albumSales: string | null;
  certifications: string[] | null;
  retroverseConnections: string[] | null;
};

/** Authoritative week-by-week historical record — Timeline Mode spine. */
export type ChartJourneyTimelineWeek = {
  weekIndex: number;
  issueDate: string;
  dateLabel: string;
  rank: number;
  movementFromPrevious: number | null;
  movementLabel: string;
  weeksOnChart: number;
  peakToDate: number;
  badges: string[];
  barWidthPct: number;
  barColor: string;
  heatBand: string;
  reentryGapWeeks: number | null;
  enrichment: ChartJourneyWeekEnrichment;
  linkedChapterIds: ChartJourneyChapterId[];
  chartWeekHref: string | null;
};

export type ChartJourneyChapterWeekAnchor = {
  chapterId: ChartJourneyChapterId;
  title: string;
  anchorWeekIndex: number;
};

export type ChartJourneyCreativeReviewDimension = {
  id:
    | "narrativeExcitement"
    | "visualExcitement"
    | "historicalClarity"
    | "momentum"
    | "ending"
    | "educationalValue"
    | "replayValue";
  label: string;
  score: number;
  note: string;
};

export type ChartJourneyCreativeReview = {
  overallScore: number;
  verdict: string;
  dimensions: ChartJourneyCreativeReviewDimension[];
};

export type ChartJourneyExperience = {
  version: 2;
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  visualLanguage: ChartJourneyVisualLanguage;
  model: ChartJourneyModel;
  /** Every chart week — authoritative historical record */
  timelineWeeks: ChartJourneyTimelineWeek[];
  /** Quick lookup: chapter → primary week */
  chapterAnchors: ChartJourneyChapterWeekAnchor[];
  track: Pick<
    TrackPageData,
    "rvtr" | "title" | "artistName" | "coverUrl" | "releaseYear" | "peakHot100" | "chartWeeks"
  >;
  chapters: ChartJourneyChapter[];
  skippedChapters: ChartJourneyChapter[];
  review: ChartJourneyCreativeReview;
};

export type ChartJourneyWorkspacePayload = {
  experience: ChartJourneyExperience | null;
  hasChartData: boolean;
};
