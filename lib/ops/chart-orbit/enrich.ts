import type { ChartOrbitNeighborRow } from "./types";

type PartialNeighbor = Pick<
  ChartOrbitNeighborRow,
  | "neighborKey"
  | "rvtr"
  | "graphTrackId"
  | "title"
  | "artistName"
  | "weeksTogether"
  | "frequency"
  | "avgProximity"
  | "minProximity"
  | "maxProximity"
> & {
  overlapDates: string[];
};

export type TrackChartStats = {
  peakPosition: number | null;
  totalChartWeeks: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
};

export function computePlaylistScore(
  weeksOverlapping: number,
  avgProximity: number,
  overlapPctOfFocus: number,
): number {
  if (weeksOverlapping <= 0 || avgProximity <= 0) return 0;
  return Math.round(((weeksOverlapping / avgProximity) * overlapPctOfFocus) / 10) / 10;
}

export function computeFateLabel(row: {
  weeksOverlapping: number;
  overlapPctOfFocus: number;
  overlapPctOfNeighbor: number;
  avgProximity: number;
  totalChartWeeks: number;
}): string {
  if (row.weeksOverlapping >= 4 && row.overlapPctOfFocus >= 15 && row.avgProximity <= 1.5) {
    return "core_companion";
  }
  if (row.weeksOverlapping >= 2 && row.overlapPctOfFocus >= 8 && row.avgProximity <= 1.75) {
    return "recurring_neighbor";
  }
  if (row.weeksOverlapping === 1) {
    return "passing_neighbor";
  }
  if (row.overlapPctOfNeighbor > 0 && row.overlapPctOfNeighbor < 5 && row.totalChartWeeks >= 10) {
    return "edge_crossover";
  }
  return "orbit_neighbor";
}

export function enrichNeighborRows(
  partialRows: PartialNeighbor[],
  statsByGraphId: Map<string, TrackChartStats>,
  focusTotalWeeks: number,
): ChartOrbitNeighborRow[] {
  const rows: ChartOrbitNeighborRow[] = partialRows.map((partial) => {
    const stats = statsByGraphId.get(partial.graphTrackId) ?? {
      peakPosition: null,
      totalChartWeeks: 0,
      firstChartDate: null,
      lastChartDate: null,
    };

    const weeksOverlapping = partial.weeksTogether;
    const overlapPctOfNeighbor =
      stats.totalChartWeeks > 0
        ? Math.round((weeksOverlapping / stats.totalChartWeeks) * 1000) / 10
        : 0;
    const overlapPctOfFocus =
      focusTotalWeeks > 0
        ? Math.round((weeksOverlapping / focusTotalWeeks) * 1000) / 10
        : 0;

    const sortedDates = [...partial.overlapDates].sort();
    const overlapFirstDate = sortedDates[0] ?? null;
    const overlapLastDate = sortedDates[sortedDates.length - 1] ?? null;

    const base = {
      ...partial,
      peakPosition: stats.peakPosition,
      totalChartWeeks: stats.totalChartWeeks,
      firstChartDate: stats.firstChartDate,
      lastChartDate: stats.lastChartDate,
      weeksOverlapping,
      overlapPctOfNeighbor,
      overlapPctOfFocus,
      overlapFirstDate,
      overlapLastDate,
    };

    const playlistScore = computePlaylistScore(
      weeksOverlapping,
      partial.avgProximity,
      overlapPctOfFocus,
    );

    const fateLabel = computeFateLabel({
      weeksOverlapping,
      overlapPctOfFocus,
      overlapPctOfNeighbor,
      avgProximity: partial.avgProximity,
      totalChartWeeks: stats.totalChartWeeks,
    });

    return { ...base, playlistScore, fateLabel };
  });

  rows.sort((a, b) => {
    if (b.playlistScore !== a.playlistScore) return b.playlistScore - a.playlistScore;
    if (b.weeksOverlapping !== a.weeksOverlapping) return b.weeksOverlapping - a.weeksOverlapping;
    if (a.avgProximity !== b.avgProximity) return a.avgProximity - b.avgProximity;
    return a.title.localeCompare(b.title);
  });

  return rows;
}
