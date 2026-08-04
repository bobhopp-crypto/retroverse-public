import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";

import { extractVersionMarkers } from "../version-evidence";
import type {
  BillboardChartOptions,
  BillboardSelection,
  BillboardSetType,
  BillboardTargetSong,
} from "../types";

export type BillboardAppearanceRow = {
  graph_track_id: number | string;
  chart_date: string;
  chart_position: number | string;
  canonical_track_id: number | string | null;
  rvtr: string | null;
  canonical_title: string | null;
  canonical_artist: string | null;
  source_title: string;
  source_artist: string;
  album_title: string | null;
  release_year: number | string | null;
};

type ChartOptionRow = {
  chart_date: string;
  year: number | string;
  month: number | string;
  row_count: number | string;
  resolved_rvtr_count: number | string;
};

function numberValue(value: number | string | null, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validRvtr(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^RVTR\d{6}$/.test(normalized) ? normalized : null;
}

export function billboardSelection(input: {
  setType: BillboardSetType;
  year: number;
  chartDate?: string | null;
}): BillboardSelection {
  const year = Math.trunc(input.year);
  if (year < 1958 || year > 2100) throw new Error("Invalid Billboard year");
  if (input.setType === "chart_week") {
    const chartDate = input.chartDate?.trim().slice(0, 10) ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chartDate) || Number(chartDate.slice(0, 4)) !== year) {
      throw new Error("A valid chart week in the selected year is required");
    }
    return {
      chartSource: "Billboard Hot 100",
      setType: "chart_week",
      year,
      chartDate,
      dateFrom: chartDate,
      dateTo: chartDate,
      label: `Billboard Hot 100 · ${chartDate}`,
      selectionKey: `billboard_hot100:week:${chartDate}`,
    };
  }
  return {
    chartSource: "Billboard Hot 100",
    setType: "chart_year",
    year,
    chartDate: null,
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
    label: `Billboard Hot 100 · ${year}`,
    selectionKey: `billboard_hot100:year:${year}`,
  };
}

export function buildBillboardTargets(
  rows: BillboardAppearanceRow[],
  selection: BillboardSelection,
): BillboardTargetSong[] {
  const grouped = new Map<number, BillboardAppearanceRow[]>();
  for (const row of rows) {
    const graphTrackId = numberValue(row.graph_track_id);
    if (!graphTrackId) continue;
    const group = grouped.get(graphTrackId);
    if (group) group.push(row);
    else grouped.set(graphTrackId, [row]);
  }

  return [...grouped.entries()]
    .map(([graphTrackId, appearances]): BillboardTargetSong => {
      const ordered = [...appearances].sort(
        (a, b) =>
          a.chart_date.localeCompare(b.chart_date) ||
          numberValue(a.chart_position, 999) - numberValue(b.chart_position, 999),
      );
      const bestRank = Math.min(...ordered.map((row) => numberValue(row.chart_position, 999)));
      const canonical = ordered.find((row) => validRvtr(row.rvtr)) ?? ordered[0]!;
      const title = (canonical.canonical_title ?? canonical.source_title).trim() || "Untitled";
      const artist = (canonical.canonical_artist ?? canonical.source_artist).trim() || "Unknown artist";
      const rvtr = validRvtr(canonical.rvtr);
      const album = ordered.find((row) => row.album_title?.trim())?.album_title?.trim() ?? null;
      const releaseYearRow = ordered.find((row) => numberValue(row.release_year) > 0);
      const releaseYear = releaseYearRow ? numberValue(releaseYearRow.release_year) : null;
      const canonicalTrackId = canonical.canonical_track_id == null
        ? null
        : numberValue(canonical.canonical_track_id) || null;
      return {
        targetRowKey: `billboard:${graphTrackId}`,
        targetType: "billboard_hot100",
        chartSource: "Billboard Hot 100",
        setType: selection.setType,
        selectedYear: selection.year,
        chartDate: selection.chartDate,
        position: bestRank,
        bestRank,
        appearanceCount: ordered.length,
        firstChartDate: ordered[0]!.chart_date.slice(0, 10),
        lastChartDate: ordered.at(-1)!.chart_date.slice(0, 10),
        graphTrackId,
        canonicalTrackId,
        rvtr,
        unresolvedIdentity: rvtr == null,
        sourceIndex: null,
        sourcePath: null,
        artist,
        title,
        album,
        year: releaseYear,
        remix: null,
        expectedDurationSeconds: null,
        requestedVersionMarkers: extractVersionMarkers(title, album),
      };
    })
    .sort(
      (a, b) =>
        a.bestRank - b.bestRank ||
        a.firstChartDate.localeCompare(b.firstChartDate) ||
        a.title.localeCompare(b.title),
    );
}

const APPEARANCE_SQL = `
  SELECT
    ca.track_id AS graph_track_id,
    ca.chart_date::date::text AS chart_date,
    ca.chart_position,
    ct.id AS canonical_track_id,
    CASE
      WHEN upper(trim(ct.retroverse_track_id::text)) ~ '^RVTR[0-9]{6}$'
        THEN upper(trim(ct.retroverse_track_id::text))
      ELSE NULL
    END AS rvtr,
    ctd.canonical_title,
    ctd.canonical_artist_name AS canonical_artist,
    t.title AS source_title,
    ar.canonical_name AS source_artist,
    album.album_title,
    album.release_year
  FROM chart_appearances ca
  JOIN tracks t ON t.id = ca.track_id
  JOIN artists ar ON ar.id = t.artist_id
  LEFT JOIN canonical_tracks ct ON ct.graph_track_id = t.id
  LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
  LEFT JOIN LATERAL (
    SELECT al.title AS album_title, al.release_year
    FROM canonical_album_tracks cat
    JOIN albums al ON al.id = cat.album_id
    WHERE upper(trim(cat.canonical_track_key::text)) = upper(trim(
      coalesce(nullif(ct.retroverse_track_id::text, ''), ctd.track_id::text, t.id::text)
    ))
    ORDER BY
      (al.title ILIKE '%greatest hits%')::int,
      (al.title ILIKE '%compilation%')::int,
      (al.title ILIKE '%live%')::int,
      al.release_year NULLS LAST,
      al.id
    LIMIT 1
  ) album ON true
  WHERE ca.chart_name = 'Billboard Hot 100'
    AND ca.chart_date::date BETWEEN $1::date AND $2::date
  ORDER BY ca.chart_date ASC, ca.chart_position ASC
`;

export async function loadBillboardTargets(
  selection: BillboardSelection,
): Promise<BillboardTargetSong[]> {
  const rows = await inspectQuery<BillboardAppearanceRow>(APPEARANCE_SQL, [
    selection.dateFrom,
    selection.dateTo,
  ]);
  const targets = buildBillboardTargets(rows, selection);
  if (targets.length === 0) throw new Error(`No Billboard Hot 100 rows found for ${selection.label}`);
  return targets;
}

export async function loadBillboardChartOptions(): Promise<BillboardChartOptions> {
  const rows = await inspectQuery<ChartOptionRow>(
    `
    SELECT
      ca.chart_date::date::text AS chart_date,
      extract(year FROM ca.chart_date)::int AS year,
      extract(month FROM ca.chart_date)::int AS month,
      count(*)::int AS row_count,
      count(*) FILTER (
        WHERE upper(trim(ct.retroverse_track_id::text)) ~ '^RVTR[0-9]{6}$'
      )::int AS resolved_rvtr_count
    FROM chart_appearances ca
    LEFT JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
    WHERE ca.chart_name = 'Billboard Hot 100'
    GROUP BY ca.chart_date::date
    ORDER BY ca.chart_date::date DESC
    `,
  );
  const weeks = rows.map((row) => ({
    chartDate: row.chart_date.slice(0, 10),
    year: numberValue(row.year),
    month: numberValue(row.month),
    rowCount: numberValue(row.row_count),
    resolvedRvtrCount: numberValue(row.resolved_rvtr_count),
  }));
  return {
    chartSource: "Billboard Hot 100",
    years: [...new Set(weeks.map((week) => week.year))].sort((a, b) => b - a),
    weeks,
  };
}
