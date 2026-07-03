import { notFound } from "next/navigation";

import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import { monthLabel } from "@/lib/artist/chart-history-display";
import { loadTrackCoverageRecord } from "@/lib/charts/load-track-coverage-batch";
import { rvtrsForChartMonth } from "@/lib/charts/rvtrs-from-chart-history";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { parseRvMonthParam } from "@/lib/rv/rv-chronology-paths";

import { RvChronologyDrill } from "../../components/rv-chronology-drill";
import { Rv2ChronologyFrame } from "../../components/rv2-chronology-frame";

import "../rv-year.css";

type Props = {
  params: Promise<{ year: string; month: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  const rvYear = normalizeRVYear((await params).year);
  const month = parseRvMonthParam((await params).month);
  if (rvYear == null || month == null) {
    return { title: "RV Chronicle — RetroVerse" };
  }
  return {
    title: `${monthLabel(month)} ${rvYear} — RetroVerse`,
  };
}

export default async function RvMonthPage({ params }: Props) {
  const { year: yearParam, month: monthParam } = await params;
  const rvYear = normalizeRVYear(yearParam);
  const month = parseRvMonthParam(monthParam);
  if (rvYear == null || month == null) notFound();

  const history = await loadRvYearChartHistory(rvYear);
  if (!history || !isUsableChartHistory(history)) notFound();

  const coverageByRvtr = await loadTrackCoverageRecord(
    rvtrsForChartMonth(history, rvYear, month),
  );

  return (
    <Rv2ChronologyFrame rvYear={rvYear}>
      <RvChronologyDrill
        rvYear={rvYear}
        history={history}
        initialMonth={month}
        shellMode="rv2"
        coverageByRvtr={coverageByRvtr}
      />
    </Rv2ChronologyFrame>
  );
}
