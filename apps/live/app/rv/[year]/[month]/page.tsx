import Link from "next/link";
import { notFound } from "next/navigation";

import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import { monthLabel, weeklyEntriesFromHistory } from "@/lib/artist/chart-history-display";
import { chartWeekPortalHref } from "@/lib/charts/chart-week-portal-href";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { parseRvMonthParam } from "@/lib/rv/rv-chronology-paths";

import "./chart-month.css";

type Props = {
  params: Promise<{ year: string; month: string }>;
};

export const revalidate = 3600;

function monthHeading(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" }).toUpperCase();
}

function weekPillLabel(chartDate: string): string {
  const date = new Date(`${chartDate.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

  const weekDates = [
    ...new Set(
      weeklyEntriesFromHistory(history)
        .filter(
          (entry) =>
            entry.year === rvYear &&
            entry.month === month &&
            entry.chartName === "Billboard Hot 100",
        )
        .map((entry) => entry.chartDate.slice(0, 10)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  if (weekDates.length === 0) notFound();

  return (
    <main className="chart-month-page">
      <section className="chart-month" aria-labelledby="chart-month-heading">
        <h1 id="chart-month-heading" className="chart-month__heading">
          {monthHeading(rvYear, month)}
        </h1>
        <nav className="chart-month__weeks" aria-label={`${monthHeading(rvYear, month)} ${rvYear} chart weeks`}>
          {weekDates.map((chartDate) => (
            <Link
              key={chartDate}
              href={chartWeekPortalHref(chartDate)}
              className="chart-month__week"
              aria-label={`Open chart week ending ${weekPillLabel(chartDate)}, ${rvYear}`}
              prefetch
            >
              {weekPillLabel(chartDate)}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
