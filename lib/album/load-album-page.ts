import { coverPathToUrl } from "@/lib/artist/cover-url";
import { displayArtistName, slugFromArtistName } from "@/lib/artist/slug";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";
import { chartsToTrajectoryWeeks } from "@/lib/track/charts-to-trajectory-weeks";
import { rvChronologyHrefFromChartDate } from "@/lib/rv/rv-chronology-paths";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

const RE_RVAL = /^RVAL\d{6}$/i;
const RE_RVTR = /^RVTR\d{6}$/i;

export type AlbumTrackRow = {
  position: number;
  title: string;
  rvtr: string | null;
  href: string | null;
};

export type AlbumRelatedRow = {
  title: string;
  releaseYear: number | null;
  rval: string | null;
  b200Peak: number | null;
  coverUrl: string | null;
  href: string;
};

export type AlbumPageData = {
  rval: string;
  title: string;
  artistName: string;
  artistSlug: string;
  artistHref: string;
  releaseYear: number | null;
  coverUrl: string | null;
  b200Peak: number | null;
  chartWeeks: number;
  firstChartDate: string | null;
  trajectoryWeeks: TrackTrajectoryWeek[];
  chartRunLabel: string;
  tracks: AlbumTrackRow[];
  relatedAlbums: AlbumRelatedRow[];
  rvYearHref: string | null;
};

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c?.trim()) continue;
    const url = coverPathToUrl(c) ?? coverPathToUrl(null, c);
    if (url) return url;
  }
  return null;
}

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

type AlbumHeaderRow = {
  pg_album_id: number;
  artist_id: number;
  title: string;
  release_year: number | null;
  artist_name: string;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
};

export async function loadAlbumPage(rvalParam: string): Promise<AlbumPageData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rval = rvalParam.trim().toUpperCase();
  if (!RE_RVAL.test(rval)) return null;

  const headerRows = await inspectQuery<AlbumHeaderRow>(
    `
    SELECT
      al.id AS pg_album_id,
      al.artist_id,
      al.title,
      al.release_year,
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
      ) AS r2_cover_key
    FROM album_external_keys aek
    JOIN albums al ON al.id = aek.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE upper(trim(aek.external_key)) = upper(trim($1))
    LIMIT 1
    `,
    [rval],
  );

  const header = headerRows[0];
  if (!header) return null;

  const pgAlbumId = header.pg_album_id;
  const title = header.title.trim();
  const artistName = displayArtistName(header.artist_name.trim());
  const artistSlug = slugFromArtistName(artistName);
  const releaseYear = header.release_year;
  const coverUrl = pickCoverUrl(header.cover_path, header.artwork_path, header.r2_cover_key);

  const [chartRows, trackRows, relatedRows, statsRows] = await Promise.all([
    inspectQuery<{
      chart_date: string;
      chart_name: string;
      chart_position: number;
      weeks_on_chart: number;
    }>(
      `
      SELECT ca.chart_date::text AS chart_date, ca.chart_name, ca.chart_position,
             COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
      FROM chart_appearances ca
      WHERE ca.album_id = $1
        AND ca.chart_name = 'Billboard 200'
      ORDER BY ca.chart_date ASC, ca.chart_position ASC
      `,
      [pgAlbumId],
    ),
    inspectQuery<{
      position: number;
      title: string;
      rvtr: string | null;
    }>(
      `
      SELECT cat.position, cat.title, cat.canonical_track_key AS rvtr
      FROM canonical_album_tracks cat
      WHERE cat.album_id = $1
      ORDER BY cat.position ASC
      `,
      [pgAlbumId],
    ),
    inspectQuery<{
      title: string;
      release_year: number | null;
      rval: string | null;
      b200_peak: number | null;
      cover_path: string | null;
      artwork_path: string | null;
      r2_cover_key: string | null;
    }>(
      `
      SELECT
        al.title,
        al.release_year,
        aek.external_key AS rval,
        min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
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
        ) AS r2_cover_key
      FROM albums al
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE al.artist_id = $1
        AND al.id <> $2
      GROUP BY al.id, al.title, al.release_year, aek.external_key, al.canonical_cover_path
      ORDER BY b200_peak ASC NULLS LAST, al.release_year ASC NULLS LAST, al.title ASC
      LIMIT 6
      `,
      [header.artist_id, pgAlbumId],
    ),
    inspectQuery<{
      b200_peak: number | null;
      chart_weeks: number;
      first_chart_date: string | null;
    }>(
      `
      SELECT
        min(ca.chart_position) AS b200_peak,
        max(COALESCE(ca.weeks_on_chart, 0))::int AS chart_weeks,
        min(ca.chart_date)::text AS first_chart_date
      FROM chart_appearances ca
      WHERE ca.album_id = $1
        AND ca.chart_name = 'Billboard 200'
      `,
      [pgAlbumId],
    ),
  ]);

  const stats = statsRows[0];
  const b200Peak = stats?.b200_peak ?? null;
  const chartWeeks = stats?.chart_weeks ?? 0;
  const firstChartDate = stats?.first_chart_date?.slice(0, 10) ?? null;

  const trajectoryWeeks = chartsToTrajectoryWeeks(
    chartRows.map((row) => ({
      chart_date: row.chart_date.slice(0, 10),
      chart_position: row.chart_position,
      weeks_on_chart: row.weeks_on_chart,
    })),
    { maxRank: 200 },
  );

  const tracks: AlbumTrackRow[] = trackRows.map((row) => {
    const rvtr = row.rvtr?.trim().toUpperCase() ?? null;
    const navigable = rvtr != null && RE_RVTR.test(rvtr);
    return {
      position: row.position,
      title: row.title.trim(),
      rvtr: navigable ? rvtr : null,
      href: navigable ? trackPageHref(rvtr) : null,
    };
  });

  const relatedAlbums: AlbumRelatedRow[] = relatedRows
    .filter((row) => row.rval?.trim() || row.title.trim())
    .map((row) => {
      const relatedRval = row.rval?.trim().toUpperCase() ?? null;
      return {
        title: row.title.trim(),
        releaseYear: row.release_year,
        rval: relatedRval,
        b200Peak: row.b200_peak,
        coverUrl: pickCoverUrl(row.cover_path, row.artwork_path, row.r2_cover_key),
        href:
          albumSuggestionHref(
            row.title.trim(),
            relatedRval ? `/albums/${relatedRval}` : null,
          ) ?? "",
      };
    })
    .filter((row) => row.href.startsWith("/album/"));

  const rvYear = releaseYear ?? yearFromDate(firstChartDate ?? trajectoryWeeks[0]?.issueDate);

  const peakWeekDate =
    (typeof b200Peak === "number"
      ? trajectoryWeeks.find((w) => w.rank === b200Peak)?.issueDate
      : null) ??
    trajectoryWeeks[trajectoryWeeks.length - 1]?.issueDate ??
    firstChartDate;

  return {
    rval,
    title,
    artistName,
    artistSlug,
    artistHref: `/artist/${artistSlug}`,
    releaseYear: rvYear,
    coverUrl,
    b200Peak,
    chartWeeks,
    firstChartDate,
    trajectoryWeeks,
    chartRunLabel: "Billboard 200",
    tracks,
    relatedAlbums,
    rvYearHref: rvChronologyHrefFromChartDate(peakWeekDate ?? firstChartDate, rvYear),
  };
}
