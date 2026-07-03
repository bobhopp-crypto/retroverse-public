import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

import { chartBarWidthPct, chartHeatBand, chartHeatColor } from "./chart-position-heat";
import { weekNumberLabel } from "./derive-row-badges";
import type {
  ChartJourneyGap,
  ChartJourneyMetrics,
  ChartJourneyMilestone,
  ChartJourneyModel,
  ChartJourneyRun,
  ChartJourneyRow,
  ChartJourneySummary,
  ChartWeekContextHooks,
} from "./types";

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b.slice(0, 10)}T12:00:00Z`).getTime() -
      new Date(`${a.slice(0, 10)}T12:00:00Z`).getTime()) /
      86400000,
  );
}

function weeksBetweenChartDates(previousDate: string, nextDate: string): number {
  const gapDays = daysBetween(previousDate, nextDate);
  return Math.max(0, Math.round(gapDays / 7) - 1);
}

export function detectChartRuns(weeks: TrackTrajectoryWeek[]): ChartJourneyRun[] {
  if (weeks.length === 0) return [];

  const runs: ChartJourneyRun[] = [];
  let current: ChartJourneyRun | null = null;

  for (let index = 0; index < weeks.length; index += 1) {
    const week = weeks[index]!;
    const isNewRun = index === 0 || week.reentry || week.movement === "debut";

    if (isNewRun) {
      if (current) runs.push(current);
      const previous = index > 0 ? weeks[index - 1]! : null;
      const weeksAbsent =
        previous != null ? weeksBetweenChartDates(previous.issueDate, week.issueDate) : 0;

      current = {
        runIndex: runs.length,
        startDate: week.issueDate,
        endDate: week.issueDate,
        weekCount: 1,
        peakRank: week.rank,
        reentry: index > 0,
        weeksAbsent,
        weeks: [week],
      };
      continue;
    }

    current!.weeks.push(week);
    current!.endDate = week.issueDate;
    current!.weekCount += 1;
    current!.peakRank = Math.min(current!.peakRank, week.rank);
  }

  if (current) runs.push(current);
  return runs;
}

export function buildChartJourneyMetrics(
  weeks: TrackTrajectoryWeek[],
  runs: ChartJourneyRun[],
  peak: number | null,
): ChartJourneyMetrics {
  let biggestClimb: number | null = null;
  let biggestDrop: number | null = null;

  for (const week of weeks) {
    if (week.delta == null || week.delta === 0) continue;
    if (week.delta > 0) {
      biggestClimb = biggestClimb == null ? week.delta : Math.max(biggestClimb, week.delta);
    } else {
      const drop = Math.abs(week.delta);
      biggestDrop = biggestDrop == null ? drop : Math.max(biggestDrop, drop);
    }
  }

  const longestRun = runs.reduce((max, run) => Math.max(max, run.weekCount), 0);
  const resolvedPeak =
    peak ?? (weeks.length > 0 ? Math.min(...weeks.map((w) => w.rank)) : null);

  let longestClimb = 0;
  let longestDecline = 0;
  let climb = 0;
  let decline = 0;
  for (let index = 1; index < weeks.length; index += 1) {
    const previous = weeks[index - 1]!.rank;
    const current = weeks[index]!.rank;
    if (current < previous) {
      climb += 1;
      decline = 0;
      longestClimb = Math.max(longestClimb, climb);
    } else if (current > previous) {
      decline += 1;
      climb = 0;
      longestDecline = Math.max(longestDecline, decline);
    } else {
      climb = 0;
      decline = 0;
    }
  }

  const reEntryRuns = runs.filter((run) => run.reentry);
  const returnedAfterFalloffWeeks =
    reEntryRuns.length > 0 ? Math.max(...reEntryRuns.map((run) => run.weeksAbsent)) : null;

  return {
    peakPosition: resolvedPeak,
    weeksOnChart: weeks.length,
    weeksInTop10: weeks.filter((week) => week.rank <= 10).length,
    weeksAtNumberOne: weeks.filter((week) => week.rank === 1).length,
    firstChartDate: weeks[0]?.issueDate ?? null,
    lastChartDate: weeks[weeks.length - 1]?.issueDate ?? null,
    longestUninterruptedRun: longestRun,
    longestClimbStreak: longestClimb,
    longestDeclineStreak: longestDecline,
    chartRunCount: runs.length,
    reEntryCount: Math.max(0, reEntryRuns.length),
    biggestWeeklyClimb: biggestClimb,
    biggestWeeklyDrop: biggestDrop,
    returnedAfterFalloffWeeks,
  };
}

function buildContextHooks(
  week: TrackTrajectoryWeek,
  focusTrackId: string | null,
): ChartWeekContextHooks {
  return {
    issueDate: week.issueDate,
    rank: week.rank,
    href: chartWeekPortalHref(week.issueDate, {
      focus: focusTrackId,
      rank: week.rank,
    }),
    numberOne: null,
    entering: null,
    leaving: null,
    neighbors: null,
    movers: null,
  };
}

export function buildChartJourneyGaps(runs: ChartJourneyRun[]): ChartJourneyGap[] {
  return runs
    .filter((run) => run.reentry && run.weeksAbsent > 0)
    .map((run) => ({
      kind: "reentry" as const,
      afterRunIndex: run.runIndex - 1,
      weeksAbsent: run.weeksAbsent,
      returnDate: run.startDate,
    }));
}

export function buildChartJourney(input: {
  weeks: TrackTrajectoryWeek[];
  peak?: number | null;
  chartLabel?: string;
  maxRank?: number;
  focusTrackId?: string | null;
  milestones?: ChartJourneyMilestone[];
}): ChartJourneyModel | null {
  const weeks = input.weeks;
  if (weeks.length === 0) return null;

  const maxRank = input.maxRank ?? 100;
  const runs = detectChartRuns(weeks);
  const metrics = buildChartJourneyMetrics(weeks, runs, input.peak ?? null);
  const focusTrackId = input.focusTrackId?.trim() || null;
  const milestones = input.milestones ?? [];
  const milestoneByDate = new Map(
    milestones.map((milestone) => [milestone.date.slice(0, 10), milestone.label] as const),
  );

  const rows: ChartJourneyRow[] = weeks.map((week, weekIndex) => {
    const previousWeek = weekIndex > 0 ? weeks[weekIndex - 1]! : null;
    const nextWeek = weekIndex < weeks.length - 1 ? weeks[weekIndex + 1]! : null;
    const weekNumber = weekNumberLabel(week, weekIndex);
    const movementFromPrevious =
      previousWeek != null ? previousWeek.rank - week.rank : week.delta ?? null;
    const movementToNext = nextWeek != null ? week.rank - nextWeek.rank : null;

    return {
      week,
      weekIndex,
      barWidthPct: chartBarWidthPct(week.rank, maxRank),
      heatBand: chartHeatBand(week.rank, maxRank),
      barColor: chartHeatColor(week.rank, maxRank),
      dateLabel: formatChartDateColumn(
        week.issueDate,
        weekIndex > 0 ? weeks[weekIndex - 1]!.issueDate : null,
      ),
      weekNumber,
      badges: [],
      detail: {
        date: week.issueDate,
        chartPosition: week.rank,
        weekNumber,
        weeksRemaining: weeks.length - weekIndex - 1,
        movementFromPrevious,
        movementToNext,
        badges: [],
        milestoneLabel: milestoneByDate.get(week.issueDate.slice(0, 10)) ?? null,
      },
      context: buildContextHooks(week, focusTrackId),
    };
  });

  return {
    chartLabel: input.chartLabel ?? "Billboard Hot 100",
    maxRank,
    metrics,
    runs,
    rows,
    gaps: buildChartJourneyGaps(runs),
    milestones,
  };
}

export function chartJourneySummary(model: ChartJourneyModel): ChartJourneySummary {
  return {
    peakPosition: model.metrics.peakPosition,
    weeksOnChart: model.metrics.weeksOnChart,
    chartRunCount: model.metrics.chartRunCount,
    reEntryCount: model.metrics.reEntryCount,
    firstChartDate: model.metrics.firstChartDate,
    lastChartDate: model.metrics.lastChartDate,
    biggestWeeklyClimb: model.metrics.biggestWeeklyClimb,
    biggestWeeklyDrop: model.metrics.biggestWeeklyDrop,
  };
}

export function formatChartDateColumn(value: string, previousDate: string | null): string {
  const key = value.slice(0, 10);
  if (key.length < 10) return value;
  const date = new Date(`${key}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  if (!previousDate) {
    return `${month} ${day}, ${year}`;
  }
  const prevYear = Number(previousDate.slice(0, 4));
  if (prevYear !== year) return `${month} ${day}, ${year}`;
  return `${month} ${day}`;
}

export function formatChartJourneyDate(value: string): string {
  const key = value.slice(0, 10);
  if (key.length < 10) return value;
  const date = new Date(`${key}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).replace(",", "");
}
