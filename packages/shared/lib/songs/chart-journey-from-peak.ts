import {
  resolveTrajectoryHistoricalHeat,
  type TrajectoryHistoricalHeat,
} from "@/lib/track/trajectory-historical-heat";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

export type PeakChartJourney = {
  peakLabel: string;
  fillPct: number;
  heat: TrajectoryHistoricalHeat;
};

function syntheticPeakWeek(rank: number, fillPct: number): TrackTrajectoryWeek {
  return {
    issueDate: "",
    rank,
    lastWeek: null,
    peakToDate: rank,
    weeksOnChart: 1,
    x: fillPct,
    previousX: null,
    movement: rank === 1 ? "same" : "debut",
    delta: null,
    reentry: false,
  };
}

/** Summary chart journey for list rows — reuses track chart-history heat language. */
export function peakChartJourney(peak: number | null, maxRank = 100): PeakChartJourney {
  if (peak == null || peak < 1 || peak > maxRank) {
    const week = syntheticPeakWeek(maxRank, 0);
    return {
      peakLabel: "—",
      fillPct: 0,
      heat: resolveTrajectoryHistoricalHeat(week, 0, [week], maxRank, maxRank),
    };
  }

  const fillPct = Math.round(((maxRank + 1 - peak) / maxRank) * 100);
  const week = syntheticPeakWeek(peak, fillPct);
  return {
    peakLabel: `#${peak}`,
    fillPct,
    heat: resolveTrajectoryHistoricalHeat(week, 0, [week], peak, maxRank),
  };
}
