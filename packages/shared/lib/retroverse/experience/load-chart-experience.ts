import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { buildChartTimelineEvents } from "@/lib/chart-journey/derive-timeline-events";
import type { ChartJourneyMilestone, ChartJourneyModel } from "@/lib/chart-journey/types";
import type { ExperienceTimelineEvent } from "@/lib/chart-journey/derive-timeline-events";
import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

export type ChartExperienceInput = {
  weeks: TrackTrajectoryWeek[];
  peak?: number | null;
  chartLabel?: string;
  maxRank?: number;
  focusTrackId?: string | null;
  releaseYear?: number | null;
  releaseDate?: string | null;
  milestones?: ChartJourneyMilestone[];
  packageTimelineEvents?: TimelineEvent[];
};

export type ChartExperience = {
  model: ChartJourneyModel;
  timeline: ExperienceTimelineEvent[];
};

function packageTimelineToMilestones(events: TimelineEvent[]): ChartJourneyMilestone[] {
  return events.map((event) => ({
    id: event.id,
    date: event.year != null ? `${event.year}-07-01` : "",
    label: event.title,
    kind: "other" as const,
  }));
}

/** Experience loader — reuses buildChartJourney + chart-derived timeline. */
export function buildChartExperience(input: ChartExperienceInput): ChartExperience | null {
  const packageMilestones = packageTimelineToMilestones(input.packageTimelineEvents ?? []);
  const mergedMilestones = [...(input.milestones ?? []), ...packageMilestones].filter(
    (entry) => entry.date.trim().length >= 4,
  );

  const model = buildChartJourney({
    weeks: input.weeks,
    peak: input.peak,
    chartLabel: input.chartLabel,
    maxRank: input.maxRank,
    focusTrackId: input.focusTrackId,
    milestones: mergedMilestones,
  });

  if (!model) return null;

  const timeline = buildChartTimelineEvents({
    model,
    releaseYear: input.releaseYear,
    releaseDate: input.releaseDate,
    extraMilestones: mergedMilestones,
  });

  return { model, timeline };
}
