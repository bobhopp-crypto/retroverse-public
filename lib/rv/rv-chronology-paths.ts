import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

export const RV_CHRONOLOGY_DEFAULT_YEAR = 1978;

export function rvYearHref(year: number | string): string {
  return `/rv/${year}`;
}

export function rvMonthHref(year: number | string, month: number): string {
  return `/rv/${year}/${month}`;
}

/** Week segment is canonical chart week date (YYYY-MM-DD). */
export function rvWeekHref(
  year: number | string,
  month: number,
  chartDate: string,
): string {
  const dateKey = chartDate.trim().slice(0, 10);
  return `/rv/${year}/${month}/${dateKey}`;
}

export function parseRvMonthParam(raw: string): number | null {
  const m = Number.parseInt(raw, 10);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  return m;
}

export function parseRvWeekParam(raw: string): string | null {
  const key = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  return key;
}

/** Map legacy `/charts?year=&month=&week=` to canonical `/rv` paths. */
export function chartsQueryToRvPath(params: {
  year?: string | null;
  month?: string | null;
  week?: string | null;
}): string {
  const year = normalizeRVYear(params.year) ?? RV_CHRONOLOGY_DEFAULT_YEAR;
  const month =
    params.month != null ? parseRvMonthParam(String(params.month)) : null;
  const week = params.week ? parseRvWeekParam(params.week) : null;

  if (month != null && week) {
    const weekMonth = Number.parseInt(week.slice(5, 7), 10);
    if (weekMonth === month) return rvWeekHref(year, month, week);
  }
  if (month != null) return rvMonthHref(year, month);
  return rvYearHref(year);
}

export function matchRvChronologyPath(pathname: string): {
  year: number;
  month: number | null;
  week: string | null;
} | null {
  const match = pathname.match(/^\/rv\/(\d{4})(?:\/(\d{1,2}))?(?:\/(\d{4}-\d{2}-\d{2}))?\/?$/);
  if (!match) return null;
  const year = normalizeRVYear(match[1]);
  if (year == null) return null;
  const month = match[2] ? parseRvMonthParam(match[2]) : null;
  const week = match[3] ? parseRvWeekParam(match[3]) : null;
  return { year, month, week };
}

/** Best-effort RV path from a chart week date (week → month → year). */
export function rvChronologyHrefFromChartDate(
  chartDate: string | null | undefined,
  fallbackYear?: number | string | null,
): string | null {
  const weekKey = chartDate?.trim().slice(0, 10) ?? "";
  const parsedWeek = parseRvWeekParam(weekKey);
  if (parsedWeek) {
    const year = Number.parseInt(parsedWeek.slice(0, 4), 10);
    const month = Number.parseInt(parsedWeek.slice(5, 7), 10);
    if (normalizeRVYear(String(year)) != null && month >= 1 && month <= 12) {
      return rvWeekHref(year, month, parsedWeek);
    }
  }
  const y = normalizeRVYear(
    fallbackYear ?? (weekKey.length >= 4 ? weekKey.slice(0, 4) : null),
  );
  return y != null ? rvYearHref(y) : null;
}

export function rvChronologyPathFromState(
  year: number | null,
  month: number | null,
  week: string | null = null,
): string | null {
  if (year == null) return null;
  const weekKey = week ? parseRvWeekParam(week) : null;
  if (month != null && month >= 1 && month <= 12) {
    if (weekKey) {
      const weekMonth = Number.parseInt(weekKey.slice(5, 7), 10);
      if (weekMonth === month) return rvWeekHref(year, month, weekKey);
    }
    return rvMonthHref(year, month);
  }
  return rvYearHref(year);
}
