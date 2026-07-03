import type { ChartHistorySessionState } from "@/lib/artist/chart-history-session";

export type ChartHistoryUrlState = ChartHistorySessionState;

type SearchParamsLike = Pick<URLSearchParams, "get">;

function parseIntParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function parseYearParam(raw: string | null, activeYears: number[]): number | null {
  const y = parseIntParam(raw);
  if (y == null || y < 1900 || y > 2100) return null;
  return activeYears.includes(y) ? y : null;
}

function parseMonthParam(raw: string | null): number | null {
  const m = parseIntParam(raw);
  if (m == null || m < 1 || m > 12) return null;
  return m;
}

function parseDecadeStart(raw: string | null, activeYears: number[]): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase();
  const decadeMatch = s.match(/^(\d{3})0s$/);
  if (decadeMatch) {
    const start = Number.parseInt(decadeMatch[1]! + "0", 10);
    return decadeStartIfActive(start, activeYears);
  }
  const n = parseIntParam(s);
  if (n == null) return null;
  const start = n % 10 === 0 ? n : Math.floor(n / 10) * 10;
  return decadeStartIfActive(start, activeYears);
}

function decadeStartIfActive(start: number, activeYears: number[]): number | null {
  if (!Number.isFinite(start)) return null;
  const hasYear = activeYears.some((y) => y >= start && y < start + 10);
  return hasYear ? start : null;
}

/** Parse `?year=&month=&decade=` for RV History; invalid values are dropped. */
export function parseChartHistorySearchParams(
  params: SearchParamsLike,
  activeYears: number[],
  options?: { useDecades?: boolean },
): ChartHistoryUrlState | null {
  const useDecades = options?.useDecades ?? false;
  const hasAny = params.get("year") || params.get("month") || params.get("decade");
  if (!hasAny) return null;

  const year = parseYearParam(params.get("year"), activeYears);
  const month = year != null ? parseMonthParam(params.get("month")) : null;
  const decadeFromUrl = useDecades
    ? parseDecadeStart(params.get("decade"), activeYears)
    : null;

  if (year == null && decadeFromUrl == null && month == null) return null;

  const decade =
    year != null && useDecades
      ? Math.floor(year / 10) * 10
      : decadeFromUrl;

  return { decade: decade ?? null, year, month };
}

export function chartHistorySearchParamsFromState(
  state: ChartHistoryUrlState,
  options?: { useDecades?: boolean },
): URLSearchParams {
  const params = new URLSearchParams();
  const useDecades = options?.useDecades ?? false;

  if (state.year != null) {
    params.set("year", String(state.year));
    if (state.month != null) params.set("month", String(state.month));
    return params;
  }

  if (useDecades && state.decade != null) {
    params.set("decade", `${state.decade}s`);
  }

  return params;
}

export function chartHistoryQueryString(
  state: ChartHistoryUrlState,
  options?: { useDecades?: boolean },
): string {
  return chartHistorySearchParamsFromState(state, options).toString();
}

export function artistChartsHref(
  slug: string,
  state?: ChartHistoryUrlState | null,
  options?: { useDecades?: boolean },
): string {
  const base = `/artist/${slug}/charts`;
  if (!state) return base;
  const qs = chartHistoryQueryString(state, options);
  return qs ? `${base}?${qs}` : base;
}

export function chartHistoryUrlStatesEqual(
  a: ChartHistoryUrlState,
  b: ChartHistoryUrlState,
): boolean {
  return a.decade === b.decade && a.year === b.year && a.month === b.month;
}
