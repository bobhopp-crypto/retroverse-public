import type {
  ArtistChartHistory,
  ChartHistoryEntry,
  RvChartSnapshot,
} from "@/lib/artist/chart-history-types";
import { monthChartSnapshotGroups } from "./chart-snapshot-shaping";

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

/** Short range for #1 runs, e.g. Feb 6–Feb 20, 1971 */
export function formatNumberOneDateRange(startIso: string, endIso: string): string {
  const start = startIso.slice(0, 10);
  const end = endIso.slice(0, 10);
  if (start === end) return formatChartDateLabel(start);
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }
  const startMon = startDate.toLocaleString("en-US", { month: "short" });
  const endMon = endDate.toLocaleString("en-US", { month: "short" });
  const year = endDate.getFullYear();
  if (startMon === endMon) {
    return `${startMon} ${startDate.getDate()}–${endDate.getDate()}, ${year}`;
  }
  return `${startMon} ${startDate.getDate()}–${endMon} ${endDate.getDate()}, ${year}`;
}

export function formatMonthYearLeadersHeading(year: number, month: number): string {
  const safeMonth = month >= 1 && month <= 12 ? month : 1;
  const safeYear = Number.isFinite(year) ? year : 1970;
  const d = new Date(safeYear, safeMonth - 1, 1);
  const mon = d.toLocaleString("en-US", { month: "long" });
  return `${mon} ${safeYear}`;
}

export function formatNumberOneTiming(snapshot: RvChartSnapshot): string {
  const weeks = snapshot.numberOneWeeks ?? 1;
  const start = snapshot.numberOneStartDate ?? snapshot.chartDate.slice(0, 10);
  const end = snapshot.numberOneEndDate ?? snapshot.chartDate.slice(0, 10);
  if (weeks > 1) {
    return `${weeks} weeks at the top · ${formatNumberOneDateRange(start, end)}`;
  }
  return `Breakout · ${formatChartDateLabel(start)}`;
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

export { monthChartSnapshotGroups } from "./chart-snapshot-shaping";
export function snapshotsForYearMonth(
  entries: ChartHistoryEntry[],
  year: number,
  month: number,
  limit = 5,
  chartFamily?: "hot-100" | "album-200",
): RvChartSnapshot[] {
  const groups = monthChartSnapshotGroups(entries, year, month, limit);
  if (chartFamily === "hot-100") return groups.singleSnapshots;
  if (chartFamily === "album-200") return groups.albumSnapshots;
  return [...groups.singleSnapshots, ...groups.albumSnapshots];
}

export type { ArtistChartHistory, ChartHistoryEntry, RvChartSnapshot };
