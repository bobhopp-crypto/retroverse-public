import {
  monthChartSnapshotGroups,
  weeklyEntriesFromHistory,
} from "@/lib/artist/chart-history-display";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import { normalizeCoverageRvtr } from "@/lib/charts/track-coverage";

/** Collect RVTR tokens from chart snapshot rows for a calendar month. */
export function rvtrsForChartMonth(
  history: ArtistChartHistory,
  year: number,
  month: number,
): string[] {
  const weekly = weeklyEntriesFromHistory(history);
  const groups = monthChartSnapshotGroups(weekly, year, month, 999);
  const tokens = new Set<string>();
  for (const row of [...groups.singleSnapshots, ...groups.albumSnapshots]) {
    const rvtr = normalizeCoverageRvtr(row.trackId);
    if (rvtr) tokens.add(rvtr);
  }
  return [...tokens];
}

/** Collect RVTR tokens from year chart leaders. */
export function rvtrsFromChartLeaders(
  leaders: Array<{ rvtr?: string | null }>,
): string[] {
  return leaders
    .map((leader) => normalizeCoverageRvtr(leader.rvtr))
    .filter((rvtr): rvtr is string => rvtr != null);
}
