import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

export type ChartJourneyBadge = "NEW" | "PEAK" | "RETURN" | "BIG JUMP" | "FINAL WEEK";

const BIG_JUMP_THRESHOLD = 10;

export function deriveRowBadges(input: {
  week: TrackTrajectoryWeek;
  weekIndex: number;
  weeks: TrackTrajectoryWeek[];
  peakPosition: number | null;
}): ChartJourneyBadge[] {
  const { week, weekIndex, weeks, peakPosition } = input;
  const badges: ChartJourneyBadge[] = [];

  if (weekIndex === 0 || week.movement === "debut") badges.push("NEW");
  if (week.reentry || week.movement === "reentry") badges.push("RETURN");
  if (peakPosition != null && week.rank === peakPosition) badges.push("PEAK");
  if (week.delta != null && week.delta >= BIG_JUMP_THRESHOLD) badges.push("BIG JUMP");
  if (weekIndex === weeks.length - 1) badges.push("FINAL WEEK");

  return badges;
}

export function weekNumberLabel(week: TrackTrajectoryWeek, weekIndex: number): number {
  if (week.weeksOnChart != null && week.weeksOnChart > 0) return week.weeksOnChart;
  return weekIndex + 1;
}
