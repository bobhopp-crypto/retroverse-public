import { monthsWithChartData, weeklyEntriesFromHistory } from "@/lib/artist/chart-history-display";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";

export type RvYearStats = {
  chartWeeks: number;
  activeMonths: number;
};

export function rvYearStats(history: ArtistChartHistory, rvYear: number): RvYearStats {
  const weekly = weeklyEntriesFromHistory(history);
  const inYear = weekly.filter((row) => row.year === rvYear);
  return {
    chartWeeks: inYear.length,
    activeMonths: monthsWithChartData(weekly, rvYear).size,
  };
}
