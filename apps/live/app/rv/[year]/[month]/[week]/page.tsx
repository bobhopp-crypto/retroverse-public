import { notFound, redirect } from "next/navigation";

import { formatChartDateLabel, monthLabel } from "@/lib/artist/chart-history-display";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { parseRvMonthParam, parseRvWeekParam } from "@/lib/rv/rv-chronology-paths";

type Props = {
  params: Promise<{ year: string; month: string; week: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  const rvYear = normalizeRVYear((await params).year);
  const month = parseRvMonthParam((await params).month);
  const week = parseRvWeekParam((await params).week);
  if (rvYear == null || month == null || week == null) {
    return { title: "RV Week — RetroVerse" };
  }
  return {
    title: `${formatChartDateLabel(week)} · ${monthLabel(month)} ${rvYear} — RetroVerse`,
  };
}

export default async function RvWeekPage({ params }: Props) {
  const { year: yearParam, month: monthParam, week: weekParam } = await params;
  const rvYear = normalizeRVYear(yearParam);
  const month = parseRvMonthParam(monthParam);
  const week = parseRvWeekParam(weekParam);
  if (rvYear == null || month == null || week == null) notFound();

  const weekMonth = Number.parseInt(week.slice(5, 7), 10);
  if (weekMonth !== month) notFound();

  redirect(chartWeekPortalHref(week));
}
