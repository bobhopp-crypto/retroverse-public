import { inspectQuery } from "@/lib/inspect/pg";

import {
  bridgeFromArtistYears,
  normArtist,
  normTitle,
  type ActiveYearBridge,
  type ActiveYearConnections,
  type ActiveYearEntry,
} from "./active-year-bridge";
import { REVIEW_PILOT_ACTIVE_YEARS } from "./review-pilot";

export type {
  ActiveYearBridge,
  ActiveYearBridgeTier,
  ActiveYearConnections,
  ActiveYearEntry,
} from "./active-year-bridge";

export {
  bridgeForRow,
  bridgeFromArtistYears,
  bridgeRank,
  connectionsHaveActivity,
  normArtist,
  normTitle,
  yearsWithArtistHits,
  yearsWithSongHits,
} from "./active-year-bridge";

function emptyByYear(activeYears: number[]): Record<number, ActiveYearEntry[]> {
  const byYear: Record<number, ActiveYearEntry[]> = {};
  for (const y of activeYears) byYear[y] = [];
  return byYear;
}

function fillByYear(
  activeYears: number[],
  rows: Array<{ chart_year: number; title: string; peak: number }>,
): Record<number, ActiveYearEntry[]> {
  const byYear = emptyByYear(activeYears);
  for (const row of rows) {
    const list = byYear[row.chart_year] ?? [];
    list.push({ title: row.title.trim(), peak: row.peak });
    byYear[row.chart_year] = list;
  }
  return byYear;
}

type ChartRow = {
  chart_year: number;
  title: string;
  peak: number;
  artist: string;
};

const ARTIST_HOT100_SQL = `
  WITH chart_raw AS (
    SELECT
      extract(year from ca.chart_date)::int AS chart_year,
      ca.chart_position,
      t.title AS title,
      ar.canonical_name AS artist,
      lower(regexp_replace(trim(regexp_replace(ar.canonical_name, '^[Tt]he\\s+', '')), '\\s+', ' ', 'g')) AS artist_norm
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND extract(year from ca.chart_date) = ANY($1::int[])
  ),
  chart_agg AS (
    SELECT chart_year, title, max(artist) AS artist, min(chart_position)::int AS peak
    FROM chart_raw
    WHERE artist_norm = $2
    GROUP BY chart_year, title
  )
  SELECT chart_year, title, peak, artist FROM chart_agg
  ORDER BY chart_year ASC, peak ASC NULLS LAST, title ASC
`;

const SONG_HOT100_SQL = `
  WITH chart_raw AS (
    SELECT
      extract(year from ca.chart_date)::int AS chart_year,
      ca.chart_position,
      t.title AS title,
      ar.canonical_name AS artist,
      lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g')) AS title_norm
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND extract(year from ca.chart_date) = ANY($1::int[])
  ),
  chart_agg AS (
    SELECT chart_year, title, max(artist) AS artist, min(chart_position)::int AS peak
    FROM chart_raw
    WHERE title_norm = $2
       OR title_norm LIKE $2 || ' %'
       OR $2 LIKE title_norm || ' %'
    GROUP BY chart_year, title
  )
  SELECT chart_year, title, peak, artist FROM chart_agg
  ORDER BY chart_year ASC, peak ASC NULLS LAST, title ASC
`;

const BRIDGE_BATCH_SQL = `
  WITH chart_raw AS (
    SELECT
      extract(year from ca.chart_date)::int AS chart_year,
      lower(regexp_replace(trim(regexp_replace(ar.canonical_name, '^[Tt]he\\s+', '')), '\\s+', ' ', 'g')) AS artist_norm
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND extract(year from ca.chart_date) = ANY($1::int[])
  )
  SELECT artist_norm, chart_year
  FROM chart_raw
  WHERE artist_norm = ANY($2::text[])
  GROUP BY artist_norm, chart_year
`;

export async function loadActiveYearConnections(input: {
  focusYear: number;
  artist: string;
  title?: string;
  activeYears?: number[];
}): Promise<ActiveYearConnections> {
  const activeYears = [...(input.activeYears ?? REVIEW_PILOT_ACTIVE_YEARS)] as number[];
  const artistNorm = normArtist(input.artist);
  const songTitle = input.title?.trim() ?? "";
  const titleNorm = normTitle(songTitle);

  const artistRows = await inspectQuery<ChartRow>(ARTIST_HOT100_SQL, [
    activeYears,
    artistNorm,
  ]);

  let songRows: ChartRow[] = [];
  if (titleNorm.length >= 3) {
    songRows = await inspectQuery<ChartRow>(SONG_HOT100_SQL, [activeYears, titleNorm]);
  }

  const artistByYear = fillByYear(activeYears, artistRows);
  const songByYear = fillByYear(activeYears, songRows);

  const displayArtist = artistRows[0]?.artist?.trim() || input.artist.trim();

  return {
    focusYear: input.focusYear,
    artist: displayArtist,
    songTitle,
    artistNorm,
    titleNorm,
    activeYears,
    artistByYear,
    songByYear,
    byYear: artistByYear,
  };
}

export async function loadActiveYearBridgeIndex(input: {
  focusYear: number;
  artists: string[];
  activeYears?: number[];
}): Promise<Map<string, ActiveYearBridge>> {
  const activeYears = [...(input.activeYears ?? REVIEW_PILOT_ACTIVE_YEARS)] as number[];
  const norms = [...new Set(input.artists.map(normArtist).filter(Boolean))];
  const index = new Map<string, ActiveYearBridge>();
  if (norms.length === 0) return index;

  const rows = await inspectQuery<{ artist_norm: string; chart_year: number }>(
    BRIDGE_BATCH_SQL,
    [activeYears, norms],
  );

  const yearsByArtist = new Map<string, Set<number>>();
  for (const row of rows) {
    const set = yearsByArtist.get(row.artist_norm) ?? new Set();
    set.add(row.chart_year);
    yearsByArtist.set(row.artist_norm, set);
  }

  for (const norm of norms) {
    const artistByYear = emptyByYear(activeYears);
    for (const y of yearsByArtist.get(norm) ?? []) {
      artistByYear[y] = [{ title: "—", peak: null }];
    }
    index.set(norm, bridgeFromArtistYears(input.focusYear, activeYears, artistByYear));
  }

  return index;
}
