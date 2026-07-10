import {
  buildChartJourney,
  buildChartJourneyMetrics,
  detectChartRuns,
} from "@/lib/chart-journey/build-chart-journey";
import type { ChartJourneyModel } from "@/lib/chart-journey/types";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

/** Normalized chart-behavior fingerprint for album similarity. */
export type AlbumChartFeatures = {
  debutRank: number;
  peakRank: number;
  weeksToPeak: number;
  totalChartWeeks: number;
  weeksAtNumberOne: number;
  weeksAtPeak: number;
  reEntryCount: number;
  longestGapOffChart: number;
  reboundCount: number;
  declineRate: number;
  longevityAfterPeak: number;
};

export type AlbumChartFeatureRow = AlbumChartFeatures & {
  pgAlbumId: number;
  rval: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  titleKey: string;
};

function weeksToPeakFromRuns(model: ChartJourneyModel): number {
  const primary = model.runs[0];
  if (!primary) return 0;
  const peakIndex = primary.weeks.findIndex((week) => week.rank === primary.peakRank);
  return peakIndex >= 0 ? peakIndex + 1 : primary.weekCount;
}

function weeksAtPeakRank(weeks: TrackTrajectoryWeek[], peak: number | null): number {
  if (peak == null) return 0;
  return weeks.filter((week) => week.rank === peak).length;
}

function declineRateAfterPeak(model: ChartJourneyModel): number {
  const peak = model.metrics.peakPosition;
  if (peak == null) return 0;
  const peakIndex = model.rows.findIndex((row) => row.week.rank === peak);
  if (peakIndex < 0) return 0;
  const after = model.rows.slice(peakIndex + 1);
  if (after.length === 0) return 0;

  let totalDrop = 0;
  let falling = 0;
  for (const row of after) {
    const move = row.detail.movementFromPrevious;
    if (move != null && move < 0) {
      totalDrop += Math.abs(move);
      falling += 1;
    }
  }
  return falling > 0 ? totalDrop / falling : 0;
}

function reboundCount(runs: ChartJourneyModel["runs"]): number {
  let rebounds = 0;
  for (let index = 1; index < runs.length; index += 1) {
    const previous = runs[index - 1]!;
    const current = runs[index]!;
    if (current.reentry && current.peakRank < previous.peakRank) rebounds += 1;
  }
  return rebounds;
}

export function albumTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildAlbumChartFeatures(
  weeks: TrackTrajectoryWeek[],
  peak: number | null,
): AlbumChartFeatures | null {
  if (weeks.length < 4) return null;

  const model = buildChartJourney({ weeks, peak, chartLabel: "Billboard 200", maxRank: 200 });
  if (!model) return null;

  const runs = model.runs;
  const metrics = model.metrics;
  const debutRank = weeks[0]?.rank ?? 200;
  const resolvedPeak = metrics.peakPosition ?? debutRank;
  const peakIndex = weeks.findIndex((week) => week.rank === resolvedPeak);
  const longevityAfterPeak =
    peakIndex >= 0 ? Math.max(0, weeks.length - peakIndex - 1) : 0;

  return {
    debutRank,
    peakRank: resolvedPeak,
    weeksToPeak: weeksToPeakFromRuns(model),
    totalChartWeeks: metrics.weeksOnChart,
    weeksAtNumberOne: metrics.weeksAtNumberOne,
    weeksAtPeak: weeksAtPeakRank(weeks, resolvedPeak),
    reEntryCount: metrics.reEntryCount,
    longestGapOffChart: metrics.returnedAfterFalloffWeeks ?? 0,
    reboundCount: reboundCount(runs),
    declineRate: declineRateAfterPeak(model),
    longevityAfterPeak,
  };
}

export function buildAlbumChartFeaturesFromRows(
  chartRows: Array<{ chart_date: string; chart_position: number; weeks_on_chart: number }>,
  peak: number | null,
): AlbumChartFeatures | null {
  const weeks: TrackTrajectoryWeek[] = chartRows.map((row, index, sorted) => {
    const previous = index > 0 ? sorted[index - 1]! : null;
    return {
      issueDate: row.chart_date.slice(0, 10),
      rank: row.chart_position,
      lastWeek: previous?.chart_position ?? null,
      peakToDate: Math.min(...sorted.slice(0, index + 1).map((w) => w.chart_position)),
      weeksOnChart: row.weeks_on_chart ?? index + 1,
      x: 0,
      previousX: null,
      movement: index === 0 ? "debut" : "same",
      delta: previous ? previous.chart_position - row.chart_position : null,
      reentry: false,
    };
  });

  const runs = detectChartRuns(weeks);
  const metrics = buildChartJourneyMetrics(weeks, runs, peak);
  const model: ChartJourneyModel = {
    chartLabel: "Billboard 200",
    maxRank: 200,
    metrics,
    runs,
    rows: [],
    gaps: [],
    milestones: [],
  };

  const features = buildAlbumChartFeatures(weeks, peak);
  return features;
}
