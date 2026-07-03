/** Server-safe chart history helpers — no pg (use load-chart-history.ts for DB load). */
export type { ArtistChartHistory, ChartHistoryEntry } from "@/lib/artist/chart-history-types";
export * from "@/lib/artist/chart-history-display";

import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import type { ArtistChartHistory, ChartHistoryEntry } from "@/lib/artist/chart-history-types";

/** Max gap between Hot 100 chart weeks before a new run starts. */
const MAX_CHART_WEEK_GAP_MS = 8 * 24 * 60 * 60 * 1000;

type ChartRun = {
  trackId: string;
  title: string;
  artist: string;
  chartName: string;
  coverUrl: string | null;
  firstChartDate: string;
  lastChartDate: string;
  peakPosition: number;
  weeksOnChart: number;
  weeks: ChartHistoryEntry[];
};

function chartDateMs(isoDate: string): number {
  const ms = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function isConsecutiveChartWeek(prevDate: string, nextDate: string): boolean {
  const gap = chartDateMs(nextDate) - chartDateMs(prevDate);
  return gap > 0 && gap <= MAX_CHART_WEEK_GAP_MS;
}

function titleChartKey(title: string, chartName: string): string {
  const t = title.trim().toLowerCase().replace(/\s+/g, " ");
  return `${t}|${chartName}`;
}

/** One row per track per chart week (for RV Week snapshots). */
function dedupeWeeklyChartRows(entries: ChartHistoryEntry[]): ChartHistoryEntry[] {
  const byKey = new Map<string, ChartHistoryEntry>();
  for (const row of entries) {
    const key = `${row.chartDate}|${row.chartName}|${row.trackId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const keep =
      row.peakPosition < existing.peakPosition ||
      (row.peakPosition === existing.peakPosition && row.weeksOnChart > existing.weeksOnChart)
        ? row
        : existing;
    byKey.set(key, keep);
  }
  return [...byKey.values()];
}

function dedupeWeeklyRows(entries: ChartHistoryEntry[]): ChartHistoryEntry[] {
  const byKey = new Map<string, ChartHistoryEntry>();
  for (const row of entries) {
    const key = `${titleChartKey(row.title, row.chartName)}|${row.chartDate}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const keep =
      row.peakPosition < existing.peakPosition ||
      (row.peakPosition === existing.peakPosition && row.weeksOnChart > existing.weeksOnChart)
        ? row
        : existing;
    byKey.set(key, keep);
  }
  return [...byKey.values()];
}

function buildChartRuns(entries: ChartHistoryEntry[]): ChartRun[] {
  const groups = new Map<string, ChartHistoryEntry[]>();
  for (const row of entries) {
    const key = titleChartKey(row.title, row.chartName);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const runs: ChartRun[] = [];

  for (const bucket of groups.values()) {
    bucket.sort((a, b) => a.chartDate.localeCompare(b.chartDate));

    let streak: ChartHistoryEntry[] = [];
    const flush = () => {
      if (streak.length === 0) return;
      runs.push(chartRunFromWeeks(streak));
      streak = [];
    };

    for (const row of bucket) {
      if (streak.length === 0) {
        streak.push(row);
        continue;
      }
      const prev = streak[streak.length - 1]!;
      if (isConsecutiveChartWeek(prev.chartDate, row.chartDate)) {
        streak.push(row);
      } else {
        flush();
        streak.push(row);
      }
    }
    flush();
  }

  return runs;
}

function chartRunFromWeeks(weeks: ChartHistoryEntry[]): ChartRun {
  const sorted = [...weeks].sort((a, b) => a.chartDate.localeCompare(b.chartDate));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  let peakPosition = 0;
  for (const w of sorted) {
    if (w.peakPosition > 0 && (peakPosition === 0 || w.peakPosition < peakPosition)) {
      peakPosition = w.peakPosition;
    }
  }
  const dbWeeks = sorted.reduce((max, w) => Math.max(max, w.weeksOnChart), 0);
  const displayTitle = sorted.reduce((best, w) =>
    w.title.length > best.length ? w.title : best,
  first.title);

  return {
    trackId: first.trackId,
    title: displayTitle,
    artist: first.artist,
    chartName: first.chartName,
    coverUrl: weeks.find((w) => w.coverUrl)?.coverUrl ?? null,
    firstChartDate: first.chartDate,
    lastChartDate: last.chartDate,
    peakPosition: peakPosition > 0 ? peakPosition : 1,
    weeksOnChart: dbWeeks > 0 ? dbWeeks : weeks.length,
    weeks: sorted,
  };
}

/** One card per chart run per calendar month (full-run peak + weeks). */
function entriesFromChartRuns(runs: ChartRun[]): ChartHistoryEntry[] {
  const entries: ChartHistoryEntry[] = [];

  for (const run of runs) {
    const runKey = `${titleChartKey(run.title, run.chartName)}|${run.firstChartDate}`;
    const latestWeekInMonth = new Map<string, ChartHistoryEntry>();

    for (const week of run.weeks) {
      const monthKey = `${week.year}-${week.month}`;
      const existing = latestWeekInMonth.get(monthKey);
      if (!existing || week.chartDate.localeCompare(existing.chartDate) > 0) {
        latestWeekInMonth.set(monthKey, week);
      }
    }

    for (const [monthKey, rep] of latestWeekInMonth) {
      const [yearStr, monthStr] = monthKey.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      entries.push({
        id: `${runKey}|${monthKey}`,
        trackId: run.trackId,
        title: run.title,
        artist: run.artist,
        chartDate: rep.chartDate,
        year: Number.isFinite(year) ? year : rep.year,
        month: Number.isFinite(month) ? month : rep.month,
        peakPosition: run.peakPosition,
        weeksOnChart: run.weeksOnChart,
        chartName: run.chartName,
        coverUrl: run.coverUrl ?? rep.coverUrl,
      });
    }
  }

  return entries.sort((a, b) => b.chartDate.localeCompare(a.chartDate));
}

function looksLikeWeeklyRows(entries: ChartHistoryEntry[]): boolean {
  const perMonthTitle = new Map<string, number>();
  for (const row of entries) {
    const key = `${titleChartKey(row.title, row.chartName)}|${row.year}|${row.month}`;
    perMonthTitle.set(key, (perMonthTitle.get(key) ?? 0) + 1);
  }
  return [...perMonthTitle.values()].some((count) => count > 1);
}

function collapseToChartRuns(entries: ChartHistoryEntry[]): ChartHistoryEntry[] {
  if (!looksLikeWeeklyRows(entries)) return entries;
  const weekly = dedupeWeeklyRows(entries);
  const runs = buildChartRuns(weekly);
  console.log("[normalized chart runs]", runs.slice(0, 10));
  return entriesFromChartRuns(runs);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseYearMonthFromDate(chartDate: unknown): { year: number; month: number } {
  if (typeof chartDate !== "string" || chartDate.length < 7) {
    return { year: 0, month: 1 };
  }
  const key = chartDate.slice(0, 10);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return {
    year: Number.isFinite(year) ? year : 0,
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1,
  };
}

function normalizeEntry(raw: unknown, fallbackArtist: string): ChartHistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const trackId = typeof row.trackId === "string" ? row.trackId.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!trackId || !title) return null;

  const chartDate =
    typeof row.chartDate === "string" && row.chartDate.trim()
      ? row.chartDate.trim().slice(0, 10)
      : "1970-01-01";
  const ym = parseYearMonthFromDate(chartDate);
  const year =
    normalizeRVYear(toFiniteNumber(row.year) ?? row.year) ??
    normalizeRVYear(ym.year) ??
    ym.year;
  const month = toFiniteNumber(row.month) ?? ym.month;
  const peak = toFiniteNumber(row.peakPosition) ?? 0;
  const weeks = toFiniteNumber(row.weeksOnChart) ?? 0;

  const artist =
    typeof row.artist === "string" && row.artist.trim() ? row.artist.trim() : fallbackArtist;

  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `${chartDate}|${trackId}`,
    trackId,
    title,
    artist,
    chartDate,
    year: year >= 1950 && year <= 2035 ? year : ym.year,
    month: month >= 1 && month <= 12 ? month : ym.month,
    peakPosition: peak > 0 ? peak : 1,
    weeksOnChart: weeks >= 0 ? weeks : 0,
    chartName:
      typeof row.chartName === "string" && row.chartName.trim() ? row.chartName.trim() : "Hot 100",
    coverUrl: typeof row.coverUrl === "string" ? row.coverUrl : null,
    releaseYear: toFiniteNumber(row.releaseYear),
  };
}

/** Coerce API/loader payloads into a safe shape — never throws. */
export function normalizeArtistChartHistory(
  raw: unknown,
  fallbackArtist = "Artist",
): ArtistChartHistory | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const entriesRaw = body.entries;
  const weeklyRaw = body.weeklyEntries;
  const yearsRaw = body.activeYears;
  const entries: ChartHistoryEntry[] = [];
  const weeklyFromPayload: ChartHistoryEntry[] = [];

  if (Array.isArray(weeklyRaw)) {
    for (const item of weeklyRaw) {
      const row = normalizeEntry(item, fallbackArtist);
      if (row) weeklyFromPayload.push(row);
    }
  }

  if (Array.isArray(entriesRaw)) {
    for (const item of entriesRaw) {
      const row = normalizeEntry(item, fallbackArtist);
      if (row) entries.push(row);
    }
  }

  const yearSet = new Set<number>();
  if (Array.isArray(yearsRaw)) {
    for (const y of yearsRaw) {
      const n = toFiniteNumber(y);
      if (n != null && n >= 1950 && n <= 2035) yearSet.add(n);
    }
  }
  for (const e of entries) {
    if (e.year >= 1950 && e.year <= 2035) yearSet.add(e.year);
  }

  const activeYears = [...yearSet].sort((a, b) => a - b);
  if (entries.length === 0 && weeklyFromPayload.length === 0) return null;

  const weeklyEntries = dedupeWeeklyChartRows(
    weeklyFromPayload.length > 0 ? weeklyFromPayload : entries,
  );
  const normalizedEntries = collapseToChartRuns(entries);
  if (normalizedEntries.length === 0 && weeklyEntries.length === 0) return null;

  const normalizedYears = new Set<number>();
  for (const e of weeklyEntries.length > 0 ? weeklyEntries : normalizedEntries) {
    if (e.year >= 1950 && e.year <= 2035) normalizedYears.add(e.year);
  }
  const normalizedActiveYears = [...normalizedYears].sort((a, b) => a - b);
  if (normalizedActiveYears.length === 0) return null;

  return {
    entries: normalizedEntries.length > 0 ? normalizedEntries : weeklyEntries,
    weeklyEntries,
    activeYears: normalizedActiveYears,
  };
}

/** Restrict RV History to a single resolved RV year (search year-aware mode). */
export function filterChartHistoryToRvYear(
  history: ArtistChartHistory,
  rvYear: number,
): ArtistChartHistory | null {
  const year = normalizeRVYear(rvYear);
  if (year == null) return null;
  const weeklyEntries = (history.weeklyEntries ?? history.entries).filter((e) => e.year === year);
  const entries = history.entries.filter((e) => e.year === year);
  if (weeklyEntries.length === 0 && entries.length === 0) return null;
  return {
    entries: entries.length > 0 ? entries : weeklyEntries,
    weeklyEntries,
    activeYears: [year],
  };
}

export function isUsableChartHistory(history: ArtistChartHistory | null | undefined): boolean {
  if (!history) return false;
  const weekly = history.weeklyEntries?.length ?? 0;
  const rows = history.entries?.length ?? 0;
  return (
    (weekly > 0 || rows > 0) &&
    Array.isArray(history.activeYears) &&
    history.activeYears.length > 0
  );
}
