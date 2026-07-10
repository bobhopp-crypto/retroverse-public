import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { chartsToTrajectoryWeeks } from "@/lib/track/charts-to-trajectory-weeks";

import {
  albumTitleKey,
  buildAlbumChartFeatures,
  type AlbumChartFeatureRow,
} from "./album-chart-features";

type CandidateHeader = {
  pg_album_id: number;
  rval: string;
  title: string;
  artist_name: string;
  release_year: number | null;
  b200_peak: number | null;
};

/** Runtime fallback when the build-time JSON index is unavailable (e.g. serverless bundle). */
export async function loadAlbumChartFeatureCandidates(input: {
  pgAlbumId: number;
  peak: number | null;
  chartWeeks: number;
  limit?: number;
}): Promise<AlbumChartFeatureRow[]> {
  const peak = input.peak;
  const chartWeeks = input.chartWeeks;
  if (peak == null || chartWeeks < 4) return [];

  const peakMin = Math.max(1, peak - 25);
  const peakMax = Math.min(200, peak + 25);
  const weeksMin = Math.max(4, Math.floor(chartWeeks * 0.35));
  const weeksMax = Math.ceil(chartWeeks * 2.5);
  const limit = input.limit ?? 120;

  const headers = await inspectQuery<CandidateHeader>(
    `
    SELECT
      al.id AS pg_album_id,
      upper(trim(aek.external_key)) AS rval,
      al.title,
      ar.canonical_name AS artist_name,
      al.release_year,
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
      count(ca.id) FILTER (WHERE ca.chart_name = 'Billboard 200')::int AS chart_weeks
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    JOIN artists ar ON ar.id = al.artist_id
    JOIN chart_appearances ca ON ca.album_id = al.id AND ca.chart_name = 'Billboard 200'
    WHERE al.id <> $1
    GROUP BY al.id, aek.external_key, al.title, ar.canonical_name, al.release_year
    HAVING count(ca.id) >= 4
      AND min(ca.chart_position) BETWEEN $2 AND $3
      AND count(ca.id) BETWEEN $4 AND $5
    ORDER BY abs(count(ca.id) - $6), abs(min(ca.chart_position) - $7), al.title
    LIMIT $8
    `,
    [input.pgAlbumId, peakMin, peakMax, weeksMin, weeksMax, chartWeeks, peak, limit],
  );

  if (headers.length === 0) return [];

  const ids = headers.map((row) => row.pg_album_id);
  const chartRows = await inspectQuery<{
    album_id: number;
    chart_date: string;
    chart_position: number;
    weeks_on_chart: number;
  }>(
    `
    SELECT ca.album_id, ca.chart_date::text AS chart_date, ca.chart_position,
           COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
    FROM chart_appearances ca
    WHERE ca.album_id = ANY($1::bigint[])
      AND ca.chart_name = 'Billboard 200'
    ORDER BY ca.album_id, ca.chart_date ASC
    `,
    [ids],
  );

  const byAlbum = new Map<number, typeof chartRows>();
  for (const row of chartRows) {
    const bucket = byAlbum.get(row.album_id) ?? [];
    bucket.push(row);
    byAlbum.set(row.album_id, bucket);
  }

  const out: AlbumChartFeatureRow[] = [];
  for (const header of headers) {
    const rows = byAlbum.get(header.pg_album_id) ?? [];
    const weeks = chartsToTrajectoryWeeks(
      rows.map((row) => ({
        chart_date: row.chart_date.slice(0, 10),
        chart_position: row.chart_position,
        weeks_on_chart: row.weeks_on_chart,
      })),
      { maxRank: 200 },
    );
    const features = buildAlbumChartFeatures(weeks, header.b200_peak);
    if (!features) continue;
    out.push({
      ...features,
      pgAlbumId: header.pg_album_id,
      rval: header.rval,
      title: header.title.trim(),
      artistName: header.artist_name.trim(),
      releaseYear: header.release_year,
      titleKey: albumTitleKey(header.title),
    });
  }

  return out;
}
