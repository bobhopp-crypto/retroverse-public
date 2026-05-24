import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

type ChartLike = {
  chart_date: string;
  chart_position: number;
  weeks_on_chart: number | null;
};

function rankX(rank: number, maxRank = 100): number {
  const p = Math.max(1, Math.min(maxRank, rank));
  if (maxRank === 200) {
    return Math.round(((200 - p) / 199) * 100 * 100) / 100;
  }
  return Math.round(Math.max(0, Math.min(100, ((101 - p) / 100) * 100)) * 100) / 100;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function chartsToTrajectoryWeeks(
  charts: ChartLike[],
  options?: { maxRank?: number },
): TrackTrajectoryWeek[] {
  const maxRank = options?.maxRank ?? 100;
  const sorted = [...charts].sort(
    (a, b) => a.chart_date.localeCompare(b.chart_date) || a.chart_position - b.chart_position,
  );

  return sorted.map((row, index) => {
    const previous = index > 0 ? sorted[index - 1]! : null;
    let movement: TrackTrajectoryWeek["movement"] = "debut";
    if (previous) {
      if (daysBetween(previous.chart_date, row.chart_date) > 10) movement = "reentry";
      else if (row.chart_position < previous.chart_position) movement = "up";
      else if (row.chart_position > previous.chart_position) movement = "down";
      else movement = "same";
    }
    const previousX = previous ? rankX(previous.chart_position, maxRank) : null;
    return {
      issueDate: row.chart_date,
      rank: row.chart_position,
      lastWeek: previous?.chart_position ?? null,
      peakToDate: Math.min(...sorted.slice(0, index + 1).map((w) => w.chart_position)),
      weeksOnChart: row.weeks_on_chart,
      x: rankX(row.chart_position, maxRank),
      previousX,
      movement,
      delta: previous ? previous.chart_position - row.chart_position : null,
      reentry: movement === "reentry",
    };
  });
}
