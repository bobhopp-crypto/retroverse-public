import { inspectQuery } from "@/lib/inspect/pg";

import { enrichNeighborRows, type TrackChartStats } from "./enrich";
import type {
  ChartOrbitFocusStats,
  ChartOrbitNeighborRow,
  ChartOrbitReport,
  ChartOrbitTrackRef,
  ChartOrbitWeekDetail,
} from "./types";

type FocusWeekRow = { chart_date: string; chart_position: number };
type NeighborSliceRow = {
  chart_date: string;
  focus_position: number;
  neighbor_position: number;
  proximity: number;
  neighbor_track_id: string;
  neighbor_rvtr: string | null;
  neighbor_title: string;
  neighbor_artist: string;
};

type ChartStatsRow = {
  track_id: string;
  peak_position: number | null;
  total_chart_weeks: number;
  first_chart_date: string | null;
  last_chart_date: string | null;
};

function neighborKey(rvtr: string | null, graphTrackId: string): string {
  const id = rvtr?.trim().toUpperCase();
  if (id && /^RVTR\d{6}$/.test(id)) return id;
  return `graph:${graphTrackId.trim()}`;
}

const FOCUS_WEEKS_SQL = `
  SELECT ca.chart_date::text AS chart_date, ca.chart_position
  FROM chart_appearances ca
  JOIN tracks t ON t.id = ca.track_id
  LEFT JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
  WHERE ca.chart_name = 'Billboard Hot 100'
    AND (
      ($1::text IS NOT NULL AND upper(trim(ct.retroverse_track_id::text)) = upper(trim($1)))
      OR ca.track_id::text = $2
    )
  ORDER BY ca.chart_date ASC
`;

const NEIGHBOR_SLICE_SQL = `
  WITH focus AS (
    SELECT
      ca.chart_date::date AS chart_date,
      ca.chart_position AS focus_position,
      ca.track_id AS focus_track_id
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    LEFT JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND (
        ($1::text IS NOT NULL AND upper(trim(ct.retroverse_track_id::text)) = upper(trim($1)))
        OR ca.track_id::text = $2
      )
  )
  SELECT
    f.chart_date::text AS chart_date,
    f.focus_position,
    nca.chart_position AS neighbor_position,
    abs(nca.chart_position - f.focus_position)::int AS proximity,
    nca.track_id::text AS neighbor_track_id,
    upper(trim(nct.retroverse_track_id::text)) AS neighbor_rvtr,
    nt.title AS neighbor_title,
    nar.canonical_name AS neighbor_artist
  FROM focus f
  JOIN chart_appearances nca
    ON nca.chart_name = 'Billboard Hot 100'
   AND nca.chart_date = f.chart_date
   AND nca.track_id != f.focus_track_id
   AND nca.chart_position BETWEEN f.focus_position - 2 AND f.focus_position + 2
   AND nca.chart_position != f.focus_position
  JOIN tracks nt ON nt.id = nca.track_id
  JOIN artists nar ON nar.id = nt.artist_id
  LEFT JOIN canonical_tracks nct ON nct.graph_track_id = nca.track_id
  ORDER BY f.chart_date ASC, nca.chart_position ASC
`;

const CHART_STATS_SQL = `
  SELECT
    ca.track_id::text AS track_id,
    min(ca.chart_position)::int AS peak_position,
    count(*)::int AS total_chart_weeks,
    min(ca.chart_date)::text AS first_chart_date,
    max(ca.chart_date)::text AS last_chart_date
  FROM chart_appearances ca
  WHERE ca.chart_name = 'Billboard Hot 100'
    AND ca.track_id = ANY($1::int[])
  GROUP BY ca.track_id
`;

function aggregateNeighbors(slices: NeighborSliceRow[]) {
  const byKey = new Map<
    string,
    {
      rvtr: string | null;
      graphTrackId: string;
      title: string;
      artistName: string;
      weeks: Set<string>;
      overlapDates: string[];
      proximities: number[];
    }
  >();

  for (const row of slices) {
    const key = neighborKey(row.neighbor_rvtr, row.neighbor_track_id);
    const date = row.chart_date.slice(0, 10);
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = {
        rvtr: row.neighbor_rvtr?.trim().toUpperCase() ?? null,
        graphTrackId: row.neighbor_track_id.trim(),
        title: row.neighbor_title.trim() || "—",
        artistName: row.neighbor_artist.trim() || "Unknown artist",
        weeks: new Set<string>(),
        overlapDates: [],
        proximities: [],
      };
      byKey.set(key, bucket);
    }
    if (!bucket.weeks.has(date)) {
      bucket.weeks.add(date);
      bucket.overlapDates.push(date);
    }
    bucket.proximities.push(row.proximity);
  }

  const partialRows = [];
  for (const [key, bucket] of byKey) {
    const proximities = bucket.proximities;
    const sum = proximities.reduce((a, b) => a + b, 0);
    partialRows.push({
      neighborKey: key,
      rvtr: bucket.rvtr,
      graphTrackId: bucket.graphTrackId,
      title: bucket.title,
      artistName: bucket.artistName,
      weeksTogether: bucket.weeks.size,
      frequency: bucket.weeks.size,
      avgProximity: proximities.length ? sum / proximities.length : 0,
      minProximity: proximities.length ? Math.min(...proximities) : 0,
      maxProximity: proximities.length ? Math.max(...proximities) : 0,
      overlapDates: bucket.overlapDates,
    });
  }

  return partialRows;
}

function mapWeekDetails(slices: NeighborSliceRow[]): ChartOrbitWeekDetail[] {
  return slices.map((row) => ({
    chartDate: row.chart_date.slice(0, 10),
    focusPosition: row.focus_position,
    neighborPosition: row.neighbor_position,
    proximity: row.proximity,
    neighborKey: neighborKey(row.neighbor_rvtr, row.neighbor_track_id),
    neighborTitle: row.neighbor_title.trim() || "—",
    neighborArtist: row.neighbor_artist.trim() || "Unknown artist",
  }));
}

function buildFocusStats(weekRows: FocusWeekRow[]): ChartOrbitFocusStats {
  if (weekRows.length === 0) {
    return {
      peakPosition: null,
      totalChartWeeks: 0,
      firstChartDate: null,
      lastChartDate: null,
    };
  }

  const dates = weekRows.map((row) => row.chart_date.slice(0, 10)).sort();
  const peakPosition = Math.min(...weekRows.map((row) => row.chart_position));

  return {
    peakPosition,
    totalChartWeeks: weekRows.length,
    firstChartDate: dates[0] ?? null,
    lastChartDate: dates[dates.length - 1] ?? null,
  };
}

async function loadChartStats(graphTrackIds: string[]): Promise<Map<string, TrackChartStats>> {
  const unique = [...new Set(graphTrackIds.filter((id) => /^\d+$/.test(id)))];
  const map = new Map<string, TrackChartStats>();
  if (unique.length === 0) return map;

  const rows = await inspectQuery<ChartStatsRow>(CHART_STATS_SQL, [unique.map(Number)]);
  for (const row of rows) {
    map.set(row.track_id.trim(), {
      peakPosition: row.peak_position,
      totalChartWeeks: row.total_chart_weeks,
      firstChartDate: row.first_chart_date?.slice(0, 10) ?? null,
      lastChartDate: row.last_chart_date?.slice(0, 10) ?? null,
    });
  }
  return map;
}

export async function analyzeChartOrbit(focus: ChartOrbitTrackRef): Promise<ChartOrbitReport> {
  const rvtrParam = focus.rvtr?.trim().toUpperCase() ?? null;
  const graphParam = focus.graphTrackId.trim();

  const [weekRows, slices] = await Promise.all([
    inspectQuery<FocusWeekRow>(FOCUS_WEEKS_SQL, [rvtrParam, graphParam]),
    inspectQuery<NeighborSliceRow>(NEIGHBOR_SLICE_SQL, [rvtrParam, graphParam]),
  ]);

  const focusStats = buildFocusStats(weekRows);
  const partialRows = aggregateNeighbors(slices);
  const graphIds = [focus.graphTrackId, ...partialRows.map((row) => row.graphTrackId)];
  const statsByGraphId = await loadChartStats(graphIds);

  const focusLoaded = statsByGraphId.get(focus.graphTrackId);
  if (focusLoaded) {
    focusStats.peakPosition = focusLoaded.peakPosition;
    focusStats.totalChartWeeks = focusLoaded.totalChartWeeks;
    focusStats.firstChartDate = focusLoaded.firstChartDate;
    focusStats.lastChartDate = focusLoaded.lastChartDate;
  }

  const neighborRows: ChartOrbitNeighborRow[] = enrichNeighborRows(
    partialRows,
    statsByGraphId,
    focusStats.totalChartWeeks,
  );

  return {
    generatedAt: new Date().toISOString(),
    focus,
    focusStats,
    totalChartWeeks: focusStats.totalChartWeeks,
    uniqueNeighbors: neighborRows.length,
    neighborRows,
    weekDetails: mapWeekDetails(slices),
  };
}
