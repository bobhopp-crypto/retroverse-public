import { coverPathToUrl } from "@/lib/artist/cover-url";
import { slugFromArtistName } from "@/lib/artist/slug";
import type {
  ChartWeekPortalContext,
  ChartWeekPortalRow,
} from "@/lib/charts/chart-week-portal-types";
import { inspectQuery } from "@/lib/inspect/pg";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";

const RE_RVTR = /^RVTR\d{6}$/i;

type WeekBoundsRow = { min_pos: number; max_pos: number };
type FocusRow = { chart_position: number; track_id: string; track_title: string; artist_name: string };
type SliceRow = {
  chart_position: number;
  track_id: string;
  rvtr: string | null;
  track_title: string;
  artist_name: string;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
  rval: string | null;
  album_title: string | null;
  prev_position: number | null;
  peak_hot100_position: number | null;
  weeks_on_chart: number;
};

import { movementLabel } from "@/lib/charts/chart-week-movement";

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c?.trim()) continue;
    const url = coverPathToUrl(c) ?? coverPathToUrl(null, c);
    if (url) return url;
  }
  return null;
}

function resolveTrackHref(trackId: string, rvtr: string | null): string | null {
  const id = rvtr?.trim().toUpperCase() ?? trackId.trim();
  if (RE_RVTR.test(id)) return trackPageHref(id);
  if (/^\d+$/.test(trackId)) return null;
  return trackPageHref(trackId);
}

function mapSliceRow(row: SliceRow): ChartWeekPortalRow {
  const rvtr = row.rvtr?.trim().toUpperCase() ?? null;
  const artistName = row.artist_name.trim() || "Unknown artist";
  const title = row.track_title.trim() || "—";
  const artistSlug = slugFromArtistName(artistName);
  const rval = row.rval?.trim().toUpperCase() ?? null;
  return {
    position: row.chart_position,
    trackId: row.track_id,
    rvtr,
    title,
    artistName,
    artistSlug,
    trackHref: resolveTrackHref(row.track_id, rvtr),
    artistHref: `/artist/${artistSlug}`,
    albumHref:
      row.album_title?.trim() && rval
        ? albumSuggestionHref(row.album_title.trim(), `/albums/${rval}`)
        : row.album_title?.trim()
          ? albumSuggestionHref(row.album_title.trim(), null)
          : null,
    coverUrl: pickCoverUrl(row.cover_path, row.artwork_path, row.r2_cover_key),
    prevPosition: row.prev_position,
    peakHot100: row.peak_hot100_position,
    weeksOnChart: row.weeks_on_chart,
  };
}


const SLICE_SQL = `
  SELECT
    ca.chart_position,
    t.id::text AS track_id,
    upper(trim(ct.retroverse_track_id::text)) AS rvtr,
    t.title AS track_title,
    ar.canonical_name AS artist_name,
    al.canonical_cover_path AS cover_path,
    (
      SELECT aal.canonical_cover_path FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
      LIMIT 1
    ) AS artwork_path,
    (
      SELECT aal.r2_cover_key FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
      LIMIT 1
    ) AS r2_cover_key,
    (
      SELECT upper(aek.external_key)
      FROM album_external_keys aek
      WHERE aek.album_id = al.id AND aek.external_key ~* '^RVAL\\d{6}$'
      LIMIT 1
    ) AS rval,
    al.title AS album_title,
    prev.prev_position,
    ctd.peak_hot100_position,
    COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
  FROM chart_appearances ca
  JOIN tracks t ON t.id = ca.track_id
  JOIN artists ar ON ar.id = t.artist_id
  LEFT JOIN canonical_tracks ct ON ct.graph_track_id = t.id
  LEFT JOIN canonical_track_display ctd
    ON upper(trim(ctd.track_id)) = upper(trim(coalesce(nullif(trim(ct.retroverse_track_id::text), ''), t.id::text)))
  LEFT JOIN LATERAL (
    SELECT ca2.chart_position AS prev_position
    FROM chart_appearances ca2
    WHERE ca2.chart_name = 'Billboard Hot 100'
      AND ca2.track_id = ca.track_id
      AND ca2.chart_date = ca.chart_date - interval '7 days'
    LIMIT 1
  ) prev ON true
  LEFT JOIN LATERAL (
    SELECT cat.album_id
    FROM canonical_album_tracks cat
    WHERE upper(trim(cat.canonical_track_key::text)) = upper(trim(t.id::text))
    ORDER BY cat.position
    LIMIT 1
  ) link ON true
  LEFT JOIN albums al ON al.id = link.album_id
  WHERE ca.chart_name = 'Billboard Hot 100'
    AND ca.chart_date::date = $1::date
    AND ca.chart_position BETWEEN $2 AND $3
  ORDER BY ca.chart_position ASC
`;

async function resolveFocusPosition(
  chartDate: string,
  focusTrackId: string | null,
  rankHint: number | null,
): Promise<FocusRow | null> {
  if (rankHint != null && rankHint >= 1 && rankHint <= 100) {
    const byRank = await inspectQuery<FocusRow>(
      `
      SELECT ca.chart_position, t.id::text AS track_id, t.title AS track_title,
             ar.canonical_name AS artist_name
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      JOIN artists ar ON ar.id = t.artist_id
      WHERE ca.chart_name = 'Billboard Hot 100'
        AND ca.chart_date::date = $1::date
        AND ca.chart_position = $2
      LIMIT 1
      `,
      [chartDate, rankHint],
    );
    if (byRank[0]) return byRank[0];
  }

  const focus = focusTrackId?.trim();
  if (!focus) return null;

  if (RE_RVTR.test(focus)) {
    const rows = await inspectQuery<FocusRow>(
      `
      SELECT ca.chart_position, t.id::text AS track_id, t.title AS track_title,
             ar.canonical_name AS artist_name
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      JOIN artists ar ON ar.id = t.artist_id
      JOIN canonical_tracks ct ON ct.graph_track_id = t.id
      WHERE ca.chart_name = 'Billboard Hot 100'
        AND ca.chart_date::date = $1::date
        AND upper(trim(ct.retroverse_track_id::text)) = upper(trim($2))
      ORDER BY ca.chart_position ASC
      LIMIT 1
      `,
      [chartDate, focus],
    );
    if (rows[0]) return rows[0];
  }

  const byGraph = await inspectQuery<FocusRow>(
    `
    SELECT ca.chart_position, t.id::text AS track_id, t.title AS track_title,
           ar.canonical_name AS artist_name
    FROM chart_appearances ca
    JOIN tracks t ON t.id = ca.track_id
    JOIN artists ar ON ar.id = t.artist_id
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND ca.chart_date::date = $1::date
      AND upper(trim(t.id::text)) = upper(trim($2))
    ORDER BY ca.chart_position ASC
    LIMIT 1
    `,
    [chartDate, focus],
  );
  return byGraph[0] ?? null;
}

export async function loadChartWeekContext(params: {
  chartDate: string;
  focusTrackId?: string | null;
  rankHint?: number | null;
  radius?: number;
  rangeFrom?: number;
  rangeTo?: number;
}): Promise<ChartWeekPortalContext | null> {
  const chartDate = params.chartDate.trim().slice(0, 10);
  const radius = Math.max(1, Math.min(25, params.radius ?? 3));

  const boundsRows = await inspectQuery<WeekBoundsRow>(
    `
    SELECT min(ca.chart_position)::int AS min_pos, max(ca.chart_position)::int AS max_pos
    FROM chart_appearances ca
    WHERE ca.chart_name = 'Billboard Hot 100'
      AND ca.chart_date::date = $1::date
    `,
    [chartDate],
  );
  const bounds = boundsRows[0];
  if (!bounds?.max_pos) return null;

  const chartMin = Math.max(1, bounds.min_pos ?? 1);
  const chartMax = Math.min(100, bounds.max_pos);

  const focus = await resolveFocusPosition(
    chartDate,
    params.focusTrackId ?? null,
    params.rankHint ?? null,
  );
  const focusPosition = focus?.chart_position ?? params.rankHint ?? null;
  if (focusPosition == null || focusPosition < chartMin || focusPosition > chartMax) {
    return null;
  }

  let rangeFrom =
    params.rangeFrom != null
      ? Math.max(chartMin, params.rangeFrom)
      : Math.max(chartMin, focusPosition - radius);
  let rangeTo =
    params.rangeTo != null
      ? Math.min(chartMax, params.rangeTo)
      : Math.min(chartMax, focusPosition + radius);

  if (rangeFrom > rangeTo) {
    rangeFrom = Math.max(chartMin, focusPosition - radius);
    rangeTo = Math.min(chartMax, focusPosition + radius);
  }

  const slice = await inspectQuery<SliceRow>(SLICE_SQL, [chartDate, rangeFrom, rangeTo]);
  if (slice.length === 0) return null;

  const rows = slice.map(mapSliceRow);

  return {
    chartDate,
    chartLabel: "Billboard Hot 100",
    focusPosition,
    focusTrackId: focus?.track_id ?? params.focusTrackId ?? null,
    focusTitle: focus?.track_title ?? null,
    focusArtist: focus?.artist_name ?? null,
    rows,
    rangeFrom,
    rangeTo,
    chartMin,
    chartMax,
  };
}
