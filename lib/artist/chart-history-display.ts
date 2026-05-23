import type {
  ArtistChartHistory,
  ChartHistoryEntry,
  RvChartSnapshot,
} from "@/lib/artist/chart-history-types";

export const RV_CALENDAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const MONTH_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export function monthLabel(month: number): string {
  return MONTH_SHORT[month - 1] ?? "—";
}

export function decadeLabel(decadeStart: number): string {
  if (!Number.isFinite(decadeStart)) return "—";
  return `${decadeStart}s`;
}

export function formatChartDisplayName(chartName: string): string {
  const stripped = chartName.replace(/billboard\s*/gi, "").trim();
  if (/200/.test(stripped)) return "Album 200";
  if (!stripped || /hot\s*100/i.test(stripped)) return "Hot 100";
  return stripped;
}

export function chartFamilyKey(chartName: string): string {
  const n = chartName.toLowerCase();
  if (n.includes("200")) return "album-200";
  return "hot-100";
}

export function isAlbumChartSnapshot(snapshot: RvChartSnapshot): boolean {
  return chartFamilyKey(snapshot.chartName) === "album-200";
}

export function splitSnapshotsByFormat(snapshots: RvChartSnapshot[]): {
  singles: RvChartSnapshot[];
  albums: RvChartSnapshot[];
} {
  const singles: RvChartSnapshot[] = [];
  const albums: RvChartSnapshot[] = [];
  for (const row of snapshots) {
    if (isAlbumChartSnapshot(row)) albums.push(row);
    else singles.push(row);
  }
  return { singles, albums };
}

export function weeklyEntriesFromHistory(history: ArtistChartHistory): ChartHistoryEntry[] {
  if (Array.isArray(history.weeklyEntries) && history.weeklyEntries.length > 0) {
    return history.weeklyEntries;
  }
  return history.entries;
}

/** Months with any Hot 100 / Album 200 chart week in the RV year (full year load). */
export function monthsWithChartData(
  entries: ChartHistoryEntry[],
  year: number,
): Set<number> {
  const months = new Set<number>();
  if (!Number.isFinite(year)) return months;
  for (const e of entries) {
    if (e?.year === year && e.month >= 1 && e.month <= 12) months.add(e.month);
  }
  return months;
}

export function formatChartDateLabel(isoDate: string): string {
  if (typeof isoDate !== "string" || isoDate.length < 8) return "—";
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(0, 10);
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const year = d.getFullYear();
  return `${mon} ${day}, ${year}`;
}

export function formatMonthYearHeading(year: number, month: number): string {
  const safeMonth = month >= 1 && month <= 12 ? month : 1;
  const safeYear = Number.isFinite(year) ? year : 1970;
  const d = new Date(safeYear, safeMonth - 1, 1);
  const mon = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
  return `${mon} ${safeYear} CHARTS`;
}

export function activeDecades(years: number[]): number[] {
  if (!Array.isArray(years)) return [];
  const decades = new Set<number>();
  for (const y of years) {
    if (typeof y === "number" && Number.isFinite(y)) decades.add(Math.floor(y / 10) * 10);
  }
  return [...decades].sort((a, b) => a - b);
}

export function yearsInDecade(years: number[], decadeStart: number): number[] {
  if (!Array.isArray(years) || !Number.isFinite(decadeStart)) return [];
  return years.filter(
    (y) => typeof y === "number" && Number.isFinite(y) && y >= decadeStart && y <= decadeStart + 9,
  );
}

export function activeMonthsInYear(entries: ChartHistoryEntry[], year: number): number[] {
  if (!Array.isArray(entries) || !Number.isFinite(year)) return [];
  const months = new Set<number>();
  for (const e of entries) {
    if (e?.year === year && e.month >= 1 && e.month <= 12) months.add(e.month);
  }
  return [...months].sort((a, b) => a - b);
}

export function entriesForYearMonth(
  entries: ChartHistoryEntry[],
  year: number,
  month: number,
  limit = 5,
): ChartHistoryEntry[] {
  if (!Array.isArray(entries) || !Number.isFinite(year) || !Number.isFinite(month)) {
    return [];
  }
  const safe = entries.filter(
    (e) => e && e.year === year && e.month === month && typeof e.chartDate === "string",
  );
  return safe
    .sort((a, b) => {
      try {
        return b.chartDate.localeCompare(a.chartDate);
      } catch {
        return 0;
      }
    })
    .slice(0, limit);
}

function chartFamilySortOrder(chartName: string): number {
  return chartFamilyKey(chartName) === "album-200" ? 1 : 0;
}

/** RV Week snapshots — #1 only per chart week; limit applied after full month grouping. */
export function snapshotsForYearMonth(
  entries: ChartHistoryEntry[],
  year: number,
  month: number,
  limit = 5,
  chartFamily?: "hot-100" | "album-200",
): RvChartSnapshot[] {
  if (!Array.isArray(entries) || !Number.isFinite(year) || !Number.isFinite(month)) {
    return [];
  }

  const inMonth = entries.filter(
    (e) => e && e.year === year && e.month === month && typeof e.chartDate === "string",
  );
  const byWeekChart = new Map<string, ChartHistoryEntry[]>();

  for (const row of inMonth) {
    const key = `${row.chartDate}|${chartFamilyKey(row.chartName)}`;
    const bucket = byWeekChart.get(key) ?? [];
    bucket.push(row);
    byWeekChart.set(key, bucket);
  }

  const snapshots: RvChartSnapshot[] = [];

  for (const [, rows] of byWeekChart) {
    const family = chartFamilyKey(rows[0]?.chartName ?? "");
    if (chartFamily != null && family !== chartFamily) continue;

    const atNumberOne = rows.filter((r) => r.peakPosition === 1);
    if (atNumberOne.length === 0) continue;

    const pick = [...atNumberOne].sort((a, b) => a.title.localeCompare(b.title))[0]!;
    const chartDisplayName = formatChartDisplayName(pick.chartName);
    snapshots.push({
      id: `${pick.chartDate}|${chartFamilyKey(pick.chartName)}`,
      trackId: pick.trackId,
      chartDate: pick.chartDate,
      year: pick.year,
      month: pick.month,
      chartName: pick.chartName,
      chartDisplayName,
      peakPosition: 1,
      title: pick.title,
      artist: pick.artist,
      coverUrl: pick.coverUrl,
      releaseYear: pick.releaseYear ?? null,
    });
  }

  const sorted = snapshots.sort((a, b) => {
    try {
      if (chartFamily === "album-200") {
        const aYear = a.releaseYear ?? a.year;
        const bYear = b.releaseYear ?? b.year;
        if (aYear !== bYear) return aYear - bYear;
        const byDate = a.chartDate.localeCompare(b.chartDate);
        if (byDate !== 0) return byDate;
        return a.title.localeCompare(b.title);
      }
      const byDate = a.chartDate.localeCompare(b.chartDate);
      if (byDate !== 0) return byDate;
      return chartFamilySortOrder(a.chartName) - chartFamilySortOrder(b.chartName);
    } catch {
      return 0;
    }
  });

  return sorted.slice(0, limit);
}

export type { ArtistChartHistory, ChartHistoryEntry, RvChartSnapshot };
