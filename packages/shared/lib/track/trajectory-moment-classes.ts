import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

export function trajectoryMomentClasses(weeks: TrackTrajectoryWeek[], index: number): string {
  const week = weeks[index];
  const previous = index > 0 ? weeks[index - 1] : null;
  const twoBack = index > 1 ? weeks[index - 2] : null;
  const classes: string[] = [];

  if (week.rank === 1) classes.push("track-trajectory-week--number-one");
  if (week.rank <= 5 && (!previous || previous.rank > 5)) {
    classes.push("track-trajectory-week--top-five");
  }
  if (week.rank <= 10 && (!previous || previous.rank > 10)) {
    classes.push("track-trajectory-week--top-ten");
  }
  if (week.rank <= 40 && (!previous || previous.rank > 40)) {
    classes.push("track-trajectory-week--top-forty");
  }
  if (week.movement === "reentry") classes.push("track-trajectory-week--recurrence");
  if ((week.weeksOnChart ?? 0) >= 20) classes.push("track-trajectory-week--long-run");
  if (previous && twoBack && previous.rank > twoBack.rank && week.rank < previous.rank) {
    classes.push("track-trajectory-week--rebound");
  }

  return classes.join(" ");
}
