import { notFound } from "next/navigation";

import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import { monthLabel } from "@/lib/artist/chart-history-display";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { parseRvMonthParam } from "@/lib/rv/rv-chronology-paths";

import { RvChronologyDrill } from "../../components/rv-chronology-drill";

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

  return (
    <RvChronologyDrill
      rvYear={rvYear}
      history={history}
      initialMonth={month}
      fileTag={`RV ${rvYear} · ${monthLabel(month)}`}
    />
  );
}
