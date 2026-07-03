import type { ChartJourneyMilestone } from "@/lib/chart-journey/types";
import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

/** Shared Chart Journey inputs — track page and museum consume the same shape. */
export type ChartJourneyPresentationProps = {
  weeks: TrackTrajectoryWeek[];
  peak: number | null;
  chartLabel: string;
  focusTrackId: string;
  releaseYear: number | null;
  releaseDate?: string | null;
  maxRank?: number;
  summary?: string | null;
  milestones?: ChartJourneyMilestone[];
  packageTimelineEvents?: TimelineEvent[];
};

export function buildChartJourneyPresentationFromTrackPage(
  track: TrackPageData,
): ChartJourneyPresentationProps | null {
  if (track.trajectoryWeeks.length === 0) return null;

  return {
    weeks: track.trajectoryWeeks,
    peak: track.peakHot100,
    chartLabel: track.chartRunLabel,
    focusTrackId: track.rvtr,
    releaseYear: track.releaseYear,
    releaseDate: track.firstChartDate,
  };
}
