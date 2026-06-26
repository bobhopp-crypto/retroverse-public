import type { ChartJourneyModel } from "./types";

export type ChartArchetype =
  | "rocket"
  | "slow_burner"
  | "instant_smash"
  | "sleeper_hit"
  | "christmas_return"
  | "re_entry"
  | "one_hit_wonder"
  | "long_tail"
  | "album_monster"
  | "chart_rivalry"
  | "steady_climber"
  | "freefall";

export const CHART_ARCHETYPE_LABELS: Record<ChartArchetype, string> = {
  rocket: "Rocket",
  slow_burner: "Slow Burner",
  instant_smash: "Instant Smash",
  sleeper_hit: "Sleeper Hit",
  christmas_return: "Christmas Return",
  re_entry: "Re-entry",
  one_hit_wonder: "One-Hit Wonder",
  long_tail: "Long Tail",
  album_monster: "Album Monster",
  chart_rivalry: "Chart Rivalry",
  steady_climber: "Steady Climber",
  freefall: "Freefall",
};

function weeksToPeak(run: ChartJourneyModel["runs"][number]): number {
  const peakIndex = run.weeks.findIndex((week) => week.rank === run.peakRank);
  return peakIndex >= 0 ? peakIndex + 1 : run.weekCount;
}

function isHolidayMonth(date: string): boolean {
  const month = Number(date.slice(5, 7));
  return month === 11 || month === 12;
}

/** Classify chart trajectory for narrative + styling. */
export function detectChartArchetype(model: ChartJourneyModel): ChartArchetype {
  const { metrics, runs } = model;
  const { weeksOnChart, peakPosition, biggestWeeklyClimb, weeksInTop10 } = metrics;

  if (weeksOnChart === 1 || runs.every((run) => run.weekCount === 1)) {
    return "one_hit_wonder";
  }

  const primary = runs[0];
  if (!primary) return "steady_climber";

  const debutRank = primary.weeks[0]?.rank ?? 100;
  const climbWeeks = weeksToPeak(primary);

  if (metrics.reEntryCount > 0) {
    const holidayReturn = runs.some((run) => run.reentry && isHolidayMonth(run.startDate));
    if (holidayReturn) return "christmas_return";
    const comeback = runs.find(
      (run, index) => index > 0 && run.peakRank < (runs[index - 1]?.peakRank ?? 100),
    );
    if (comeback) return "re_entry";
    return "re_entry";
  }

  if (biggestWeeklyClimb != null && biggestWeeklyClimb >= 18) return "rocket";

  if (debutRank <= 5 && climbWeeks <= 2) return "instant_smash";

  if (weeksOnChart >= 28 && peakPosition != null && peakPosition <= 5) return "album_monster";

  if (weeksOnChart >= 18 && peakPosition != null && peakPosition > 10) return "long_tail";

  if (climbWeeks >= 10 && peakPosition != null && peakPosition <= 10) return "slow_burner";

  if (weeksInTop10 === 0 && weeksOnChart >= 12 && (peakPosition ?? 100) > 20) {
    return "sleeper_hit";
  }

  if (
    metrics.biggestWeeklyDrop != null &&
    metrics.biggestWeeklyDrop >= 15 &&
    metrics.longestDeclineStreak >= 3
  ) {
    return "freefall";
  }

  if (peakPosition != null && peakPosition <= 3 && weeksOnChart >= 8 && climbWeeks <= 4) {
    return "chart_rivalry";
  }

  if (climbWeeks >= 4 && metrics.longestClimbStreak >= 3) return "steady_climber";

  return "steady_climber";
}

const ARCHETYPE_OPENINGS: Record<ChartArchetype, (model: ChartJourneyModel) => string> = {
  rocket: (model) => {
    const climb = model.metrics.biggestWeeklyClimb;
    return climb != null
      ? `A rocket up the chart — jumping ${climb} positions in a single week on its way to the top.`
      : `A rocket up the chart — this run climbed faster than almost anything around it.`;
  },
  instant_smash: () =>
    "An instant smash — it arrived near the top of the chart and never looked like a slow build.",
  slow_burner: (model) => {
    const peak = model.metrics.peakPosition;
    const weeks = model.metrics.weeksOnChart;
    return `A slow burner — week after week it kept climbing until it finally reached #${peak ?? "?"} across ${weeks} chart weeks.`;
  },
  sleeper_hit: (model) => {
    const weeks = model.metrics.weeksOnChart;
    const peak = model.metrics.peakPosition;
    return `A sleeper hit — it hung around for ${weeks} weeks, peaking at #${peak ?? "?"} without ever dominating the Top 10.`;
  },
  christmas_return: () =>
    "A Christmas return — the song came back during the late-year season when familiar hits reclaim the chart.",
  re_entry: (model) => {
    const count = model.metrics.reEntryCount;
    return count > 1
      ? `A chart re-entry — the song disappeared, then returned ${count} times.`
      : `A chart re-entry — it fell off, then found its way back.`;
  },
  one_hit_wonder: () =>
    "A one-hit wonder — a brief chart appearance that left a sharp footprint and vanished.",
  long_tail: (model) =>
    `A long tail — ${model.metrics.weeksOnChart} weeks on the chart, outlasting most peers without ever claiming the summit.`,
  album_monster: (model) =>
    `An album monster — ${model.metrics.weeksOnChart} weeks on chart with a peak at #${model.metrics.peakPosition ?? "?"}, the kind of run that defines an era.`,
  chart_rivalry: (model) =>
    `A chart rivalry — peaking at #${model.metrics.peakPosition ?? "?"} amid a crowded field fighting for the top.`,
  steady_climber: (model) => {
    const peak = model.metrics.peakPosition;
    return peak != null && peak <= 10
      ? `A steady climber — earning the Top 10 methodically rather than exploding overnight.`
      : `The chart run unfolded gradually — a patient climb rather than a flash moment.`;
  },
  freefall: (model) => {
    const drop = model.metrics.biggestWeeklyDrop;
    return drop != null
      ? `A freefall — after its peak, the song dropped ${drop} positions in a single week.`
      : `A freefall — after its peak, the song tumbled quickly off the chart.`;
  },
};

/** Unique opening paragraph for the chart exhibit placard. */
export function buildChartJourneyOpening(model: ChartJourneyModel): string {
  const archetype = detectChartArchetype(model);
  return ARCHETYPE_OPENINGS[archetype](model);
}

export function chartArchetypeLabel(archetype: ChartArchetype): string {
  return CHART_ARCHETYPE_LABELS[archetype];
}

export function chartArchetypeCssClass(archetype: ChartArchetype): string {
  return `rv-exp-cj__archetype--${archetype.replace(/_/g, "-")}`;
}
