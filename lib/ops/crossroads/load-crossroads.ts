import { inspectQuery } from "@/lib/inspect/pg";
import { normArtist } from "@/lib/ops/year-workspace/active-year-bridge";
import { vdjPerformanceYearSql } from "@/lib/ops/vdj-performance-filter";

import type { CrossroadsArtist, CrossroadsPayload, CrossroadsSongRow } from "./types";

type DbRow = { artist: string; title: string };

function crossroadsYearQuery(year: number): string {
  const perf = vdjPerformanceYearSql(year, "ma");
  return `
    SELECT
      coalesce(nullif(trim(ma.artist_text), ''), 'Unknown artist') AS artist,
      coalesce(
        nullif(trim(ma.title_text), ''),
        nullif(trim(ma.filename), ''),
        'Untitled'
      ) AS title
    FROM media_assets ma
    WHERE ma.id IS NOT NULL
    ${perf}
    ORDER BY lower(coalesce(nullif(trim(ma.artist_text), ''), 'Unknown artist')),
      lower(coalesce(nullif(trim(ma.title_text), ''), nullif(trim(ma.filename), ''), 'Untitled'))
  `;
}

async function loadYearSongs(year: number): Promise<CrossroadsSongRow[]> {
  const rows = await inspectQuery<DbRow>(crossroadsYearQuery(year), []);
  return rows.map((r) => ({
    artist: r.artist.trim() || "Unknown artist",
    title: r.title.trim() || "Untitled",
  }));
}

function pickDisplayName(current: string, next: string): string {
  if (current === "Unknown artist" && next !== "Unknown artist") return next;
  if (current.length >= next.length) return current;
  return next;
}

/** 0 = all selected years, 1 = two years, 2 = other bridges (still ≥2 years). */
function bridgeSortTier(artist: CrossroadsArtist, selectedYearCount: number): number {
  if (artist.spanCount >= selectedYearCount) return 0;
  if (artist.spanCount === 2) return 1;
  return 2;
}

function sortArtists(
  a: CrossroadsArtist,
  b: CrossroadsArtist,
  selectedYearCount: number,
): number {
  const tierA = bridgeSortTier(a, selectedYearCount);
  const tierB = bridgeSortTier(b, selectedYearCount);
  if (tierA !== tierB) return tierA - tierB;
  if (a.totalSongs !== b.totalSongs) return b.totalSongs - a.totalSongs;
  return a.artist.localeCompare(b.artist);
}

export async function loadCrossroads(
  yearA: number,
  yearB: number,
  yearC: number,
): Promise<CrossroadsPayload> {
  const years: [number, number, number] = [yearA, yearB, yearC];
  const distinctYears = [...new Set(years)].sort((a, b) => a - b);
  const byYear = await Promise.all(
    distinctYears.map(async (year) => ({ year, songs: await loadYearSongs(year) })),
  );

  type Acc = {
    artist: string;
    yearCounts: Map<number, number>;
    titlesByYear: Map<number, Set<string>>;
  };

  const byNorm = new Map<string, Acc>();

  for (const { year, songs } of byYear) {
    for (const song of songs) {
      const artistNorm = normArtist(song.artist);
      if (!artistNorm) continue;

      let acc = byNorm.get(artistNorm);
      if (!acc) {
        acc = {
          artist: song.artist,
          yearCounts: new Map(),
          titlesByYear: new Map(),
        };
        byNorm.set(artistNorm, acc);
      }

      acc.artist = pickDisplayName(acc.artist, song.artist);
      acc.yearCounts.set(year, (acc.yearCounts.get(year) ?? 0) + 1);

      let titles = acc.titlesByYear.get(year);
      if (!titles) {
        titles = new Set();
        acc.titlesByYear.set(year, titles);
      }
      titles.add(song.title);
    }
  }

  const artists: CrossroadsArtist[] = [];

  for (const [artistNorm, acc] of byNorm) {
    const yearsPresent = distinctYears.filter((y) => (acc.yearCounts.get(y) ?? 0) > 0);
    if (yearsPresent.length < 2) continue;

    const yearCounts: Record<number, number> = {};
    const songsByYear: Record<number, string[]> = {};
    let totalSongs = 0;

    for (const y of distinctYears) {
      const count = acc.yearCounts.get(y) ?? 0;
      yearCounts[y] = count;
      totalSongs += count;
      const titles = acc.titlesByYear.get(y);
      songsByYear[y] = titles ? [...titles].sort((a, b) => a.localeCompare(b)) : [];
    }

    const spanCount = yearsPresent.length;
    const inAllYears = distinctYears.every((y) => (acc.yearCounts.get(y) ?? 0) > 0);

    artists.push({
      artistNorm,
      artist: acc.artist,
      yearsPresent,
      yearCounts,
      songsByYear,
      spanCount,
      totalSongs,
      inAllYears,
    });
  }

  artists.sort((a, b) => sortArtists(a, b, distinctYears.length));

  return {
    ok: true,
    years,
    distinctYears,
    artists,
    artistCount: artists.length,
  };
}
