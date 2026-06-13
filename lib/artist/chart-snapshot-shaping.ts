import type { ChartHistoryEntry, RvChartSnapshot } from "@/lib/artist/chart-history-types";

function chartFamilyKey(chartName: string): string {
  const n = chartName.toLowerCase();
  if (n.includes("200")) return "album-200";
  return "hot-100";
}

function formatChartDisplayName(chartName: string): string {
  const stripped = chartName.replace(/billboard\s*/gi, "").trim();
  if (/200/.test(stripped)) return "Billboard 200";
  if (!stripped || /hot\s*100/i.test(stripped)) return "Hot 100";
  return stripped;
}

function chartFamilySortOrder(chartName: string): number {
  return chartFamilyKey(chartName) === "album-200" ? 1 : 0;
}

export type ChartFamily = "hot-100" | "album-200";

function normalizeEntityKey(title: string, artist: string): string {
  const t = title.trim().toLowerCase().replace(/\s+/g, " ");
  const a = artist.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, " ");
  return `${t}|${a}`;
}

type NumberOneRun = {
  entry: ChartHistoryEntry;
  weeksAtOne: number;
  startDate: string;
  endDate: string;
};

function buildNumberOneRuns(sortedWeeklyOnes: ChartHistoryEntry[]): NumberOneRun[] {
  if (!sortedWeeklyOnes.length) return [];

  const runs: NumberOneRun[] = [];
  let current: NumberOneRun = {
    entry: sortedWeeklyOnes[0]!,
    weeksAtOne: 1,
    startDate: sortedWeeklyOnes[0]!.chartDate.slice(0, 10),
    endDate: sortedWeeklyOnes[0]!.chartDate.slice(0, 10),
  };

  for (let index = 1; index < sortedWeeklyOnes.length; index += 1) {
    const week = sortedWeeklyOnes[index]!;
    const key = normalizeEntityKey(week.title, week.artist);
    const currentKey = normalizeEntityKey(current.entry.title, current.entry.artist);
    if (key === currentKey) {
      current.weeksAtOne += 1;
      current.endDate = week.chartDate.slice(0, 10);
      continue;
    }
    runs.push(current);
    current = {
      entry: week,
      weeksAtOne: 1,
      startDate: week.chartDate.slice(0, 10),
      endDate: week.chartDate.slice(0, 10),
    };
  }
  runs.push(current);
  return runs;
}

function runForChartDate(runs: NumberOneRun[], chartDate: string): NumberOneRun | null {
  const key = chartDate.slice(0, 10);
  for (const run of runs) {
    if (key >= run.startDate && key <= run.endDate) return run;
  }
  return runs.find((run) => run.startDate === key) ?? null;
}

function entryToSnapshot(entry: ChartHistoryEntry, run: NumberOneRun | null): RvChartSnapshot {
  return {
    id: `${entry.chartDate}|${chartFamilyKey(entry.chartName)}|${entry.trackId}`,
    trackId: entry.trackId,
    chartDate: entry.chartDate,
    year: entry.year,
    month: entry.month,
    chartName: entry.chartName,
    chartDisplayName: formatChartDisplayName(entry.chartName),
    peakPosition: 1,
    title: entry.title,
    artist: entry.artist,
    coverUrl: entry.coverUrl,
    releaseYear: entry.releaseYear ?? null,
    numberOneWeeks: run?.weeksAtOne ?? 1,
    numberOneStartDate: run?.startDate ?? entry.chartDate.slice(0, 10),
    numberOneEndDate: run?.endDate ?? entry.chartDate.slice(0, 10),
  };
}

/** One editorial #1 pick per chart week (ties broken deterministically). */
export function numberOneEntriesForWeeks(
  entries: ChartHistoryEntry[],
  family: ChartFamily,
): ChartHistoryEntry[] {
  const byWeek = new Map<string, ChartHistoryEntry[]>();

  for (const row of entries) {
    if (chartFamilyKey(row.chartName) !== family) continue;
    if (row.peakPosition !== 1) continue;
    if (typeof row.chartDate !== "string") continue;

    const key = row.chartDate.slice(0, 10);
    const bucket = byWeek.get(key) ?? [];
    bucket.push(row);
    byWeek.set(key, bucket);
  }

  const picks: ChartHistoryEntry[] = [];
  for (const date of [...byWeek.keys()].sort()) {
    const rows = byWeek.get(date)!;
    const pick = [...rows].sort((a, b) => a.title.localeCompare(b.title))[0]!;
    picks.push(pick);
  }

  return picks;
}

/**
 * Collapse consecutive #1 dominance into editorial beats:
 * first week, changeovers, re-entries, and a month-end capstone for long runs.
 */
export function shapeNumberOneEvents(entries: ChartHistoryEntry[]): ChartHistoryEntry[] {
  if (entries.length <= 1) return entries;

  const shaped: ChartHistoryEntry[] = [];
  let lastKey: string | null = null;

  for (let index = 0; index < entries.length; index += 1) {
    const week = entries[index]!;
    const key = normalizeEntityKey(week.title, week.artist);

    if (index === 0) {
      shaped.push(week);
      lastKey = key;
      continue;
    }

    if (key !== lastKey) {
      shaped.push(week);
      lastKey = key;
    }
  }

  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  const firstKey = normalizeEntityKey(first.title, first.artist);
  const lastKeyFinal = normalizeEntityKey(last.title, last.artist);
  const lastShaped = shaped[shaped.length - 1];

  if (
    entries.length >= 3 &&
    firstKey === lastKeyFinal &&
    lastShaped?.chartDate !== last.chartDate
  ) {
    shaped.push(last);
  }

  return shaped;
}

function sortSnapshotsForFamily(
  snapshots: RvChartSnapshot[],
  family: ChartFamily,
): RvChartSnapshot[] {
  return [...snapshots].sort((a, b) => {
    try {
      if (family === "album-200") {
        const aYear = a.releaseYear ?? a.year;
        const bYear = b.releaseYear ?? b.year;
        if (aYear !== bYear) return aYear - bYear;
      }
      const byDate = a.chartDate.localeCompare(b.chartDate);
      if (byDate !== 0) return byDate;
      return chartFamilySortOrder(a.chartName) - chartFamilySortOrder(b.chartName);
    } catch {
      return 0;
    }
  });
}

function shapedSnapshotsForFamily(
  inMonth: ChartHistoryEntry[],
  family: ChartFamily,
): RvChartSnapshot[] {
  const weeklyOnes = numberOneEntriesForWeeks(inMonth, family);
  const runs = buildNumberOneRuns(weeklyOnes);
  const shaped = shapeNumberOneEvents(weeklyOnes);
  const snapshots = shaped.map((entry) =>
    entryToSnapshot(entry, runForChartDate(runs, entry.chartDate)),
  );
  return sortSnapshotsForFamily(snapshots, family);
}

/** When both chart families have data, avoid crowding one side out of the month story. */
export function balanceSnapshotFamilies(
  singles: RvChartSnapshot[],
  albums: RvChartSnapshot[],
  limitPerFamily: number,
): { singles: RvChartSnapshot[]; albums: RvChartSnapshot[] } {
  if (limitPerFamily >= 50) {
    return { singles, albums };
  }

  if (singles.length === 0 || albums.length === 0) {
    return {
      singles: singles.slice(0, limitPerFamily),
      albums: albums.slice(0, limitPerFamily),
    };
  }

  const albumReserve = Math.min(albums.length, Math.min(2, limitPerFamily));
  const albumOut = albums.slice(0, Math.max(albumReserve, Math.min(albums.length, limitPerFamily)));

  let singleOut = singles.slice(0, limitPerFamily);
  if (singleOut.length >= limitPerFamily - 1 && albumOut.length >= albumReserve) {
    singleOut = singles.slice(0, Math.max(albumReserve, limitPerFamily - albumReserve));
  }

  return { singles: singleOut, albums: albumOut };
}

export function monthChartSnapshotGroups(
  entries: ChartHistoryEntry[],
  year: number,
  month: number,
  limitPerFamily = 5,
): { singleSnapshots: RvChartSnapshot[]; albumSnapshots: RvChartSnapshot[] } {
  if (!Array.isArray(entries) || !Number.isFinite(year) || !Number.isFinite(month)) {
    return { singleSnapshots: [], albumSnapshots: [] };
  }

  const inMonth = entries.filter(
    (entry) =>
      entry &&
      entry.year === year &&
      entry.month === month &&
      typeof entry.chartDate === "string",
  );

  const singles = shapedSnapshotsForFamily(inMonth, "hot-100");
  const albums = shapedSnapshotsForFamily(inMonth, "album-200");

  const balanced = balanceSnapshotFamilies(singles, albums, limitPerFamily);
  return {
    singleSnapshots: balanced.singles,
    albumSnapshots: balanced.albums,
  };
}

/** Count raw #1 chart weeks in a month (before changeover collapse). */
export function countNumberOneWeeksInMonth(
  entries: ChartHistoryEntry[],
  year: number,
  month: number,
  family: ChartFamily,
): number {
  const inMonth = entries.filter(
    (entry) =>
      entry &&
      entry.year === year &&
      entry.month === month &&
      typeof entry.chartDate === "string",
  );
  return numberOneEntriesForWeeks(inMonth, family).length;
}
