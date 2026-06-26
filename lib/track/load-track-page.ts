import { cache } from "react";

import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { displayArtistName, slugFromArtistName } from "@/lib/artist/slug";
import { trackPageHref } from "@/lib/search/entity-routes";

const RE_RVAL = /^RVAL\d{6}$/i;
import { chartsToTrajectoryWeeks } from "@/lib/track/charts-to-trajectory-weeks";
import { formatCanonicalTitle } from "@/lib/track/format-canonical-title";
import { rvChronologyHrefFromChartDate } from "@/lib/rv/rv-chronology-paths";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

export type TrackAlbumLink = {
  title: string;
  releaseYear: number | null;
  rval: string | null;
  coverUrl: string | null;
  href: string | null;
};

export type TrackRelatedSong = {
  rvtr: string;
  title: string;
  releaseYear: number | null;
  peakHot100: number | null;
  href: string;
  coverUrl: string | null;
};

export type TrackPageData = {
  rvtr: string;
  title: string;
  artistName: string;
  artistSlug: string;
  artistHref: string;
  releaseYear: number | null;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartDate: string | null;
  coverUrl: string | null;
  hasHot100: boolean;
  hasVdjMedia: boolean;
  albums: TrackAlbumLink[];
  trajectoryWeeks: TrackTrajectoryWeek[];
  chartRunLabel: string;
  relatedTracks: TrackRelatedSong[];
  rvYearHref: string | null;
};

function pickCoverUrl(
  artworkUpdatedAt: string | null | undefined,
  ...candidates: (string | null | undefined)[]
): string | null {
  const url = resolveAlbumCoverUrlFromRow({
    cover_path: candidates[0],
    artwork_path: candidates[1],
    r2_cover_key: candidates[2],
  });
  if (!url) return null;
  const stamp = artworkUpdatedAt?.trim();
  if (!stamp) return url;
  const rev = Date.parse(stamp);
  if (!Number.isFinite(rev)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${rev}`;
}

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

type TrackRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  first_chart_date: string | null;
  peak_hot100_position: number | null;
  chart_weeks: number;
  has_hot100: boolean;
};

async function loadTrackPageImpl(idParam: string): Promise<TrackPageData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const raw = decodeURIComponent(idParam).trim();
  if (!raw) return null;

  const isRvtr = /^RVTR\d{6}$/i.test(raw);
  const trackRows = isRvtr
    ? await inspectQuery<TrackRow>(
        `
        SELECT track_id, canonical_title, canonical_artist_name, first_chart_date::text AS first_chart_date,
               peak_hot100_position, chart_weeks, has_hot100
        FROM canonical_track_display
        WHERE upper(trim(track_id)) = upper(trim($1))
           OR upper(trim(coalesce(retroverse_track_id, ''))) = upper(trim($1))
        LIMIT 1
        `,
        [raw],
      )
    : await inspectQuery<TrackRow>(
        `
        SELECT track_id, canonical_title, canonical_artist_name, first_chart_date::text AS first_chart_date,
               peak_hot100_position, chart_weeks, has_hot100
        FROM canonical_track_display
        WHERE lower(regexp_replace(regexp_replace(trim(canonical_title), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
              = lower(regexp_replace(regexp_replace(trim($1), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
           OR canonical_title ILIKE $2
        ORDER BY has_hot100 DESC, peak_hot100_position ASC NULLS LAST, chart_weeks DESC
        LIMIT 1
        `,
        [raw, raw.replace(/-/g, " ")],
      );

  const track = trackRows[0];
  if (!track) return null;

  const rvtr = track.track_id.trim().toUpperCase();
  const title = formatCanonicalTitle(track.canonical_title);
  const artistName = displayArtistName(track.canonical_artist_name.trim());
  const artistSlug = slugFromArtistName(artistName);
  const releaseYear = yearFromDate(track.first_chart_date);

  const [albumRows, chartRows, relatedRows, coverageMap] = await Promise.all([
    inspectQuery<{
      title: string;
      release_year: number | null;
      rval: string | null;
      cover_path: string | null;
      artwork_path: string | null;
      r2_cover_key: string | null;
      artwork_updated_at: string | null;
    }>(
      `
      SELECT al.title, al.release_year, aek.external_key AS rval,
             al.canonical_cover_path AS cover_path,
             (
               SELECT aal.canonical_cover_path FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                        aal.confidence_score DESC NULLS LAST,
                        aal.updated_at DESC NULLS LAST,
                        aal.id DESC
               LIMIT 1
             ) AS artwork_path,
             (
               SELECT aal.r2_cover_key FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                        aal.confidence_score DESC NULLS LAST,
                        aal.updated_at DESC NULLS LAST,
                        aal.id DESC
               LIMIT 1
             ) AS r2_cover_key,
             (
               SELECT aal.updated_at::text FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                        aal.confidence_score DESC NULLS LAST,
                        aal.updated_at DESC NULLS LAST,
                        aal.id DESC
               LIMIT 1
             ) AS artwork_updated_at
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
      ORDER BY cat.position ASC
      LIMIT 4
      `,
      [rvtr],
    ),
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
      JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
      WHERE upper(trim(ct.track_id)) = upper(trim($1))
         OR upper(trim(coalesce(ct.retroverse_track_id, ''))) = upper(trim($1))
      ORDER BY
        CASE WHEN ca.chart_name ILIKE '%Hot 100%' THEN 0 ELSE 1 END,
        ca.chart_date ASC,
        ca.chart_position ASC
      `,
      [rvtr],
    ),
    inspectQuery<{
      track_id: string;
      canonical_title: string;
      peak_hot100_position: number | null;
      first_chart_date: string | null;
    }>(
      `
      SELECT track_id, canonical_title, peak_hot100_position, first_chart_date::text AS first_chart_date
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\\s+', '', 'i'))
        AND upper(trim(track_id)) <> upper(trim($2))
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 4
      `,
      [artistName, rvtr],
    ),
    loadTrackCoverageByRvtr([rvtr]),
  ]);

  let resolvedChartRows = chartRows;
  if (resolvedChartRows.length === 0) {
    resolvedChartRows = await inspectQuery<{
      chart_date: string;
      chart_name: string;
      chart_position: number;
      weeks_on_chart: number;
    }>(
      `
      SELECT ca.chart_date::text AS chart_date, ca.chart_name, ca.chart_position,
             COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      JOIN artists ar ON ar.id = t.artist_id
      WHERE lower(trim(t.title)) = lower(trim($1))
        AND lower(regexp_replace(trim(ar.canonical_name), '^the\\s+', '', 'i'))
          = lower(regexp_replace(trim($2), '^the\\s+', '', 'i'))
      ORDER BY
        CASE WHEN ca.chart_name ILIKE '%Hot 100%' THEN 0 ELSE 1 END,
        ca.chart_date ASC,
        ca.chart_position ASC
      `,
      [title, artistName],
    );
  }

  const albums: TrackAlbumLink[] = albumRows.map((row) => {
    const rval = row.rval?.trim().toUpperCase() ?? null;
    return {
      title: row.title.trim(),
      releaseYear: row.release_year,
      rval,
      coverUrl: pickCoverUrl(
        row.artwork_updated_at,
        row.cover_path,
        row.artwork_path,
        row.r2_cover_key,
      ),
      href: rval && RE_RVAL.test(rval) ? `/album/${rval}` : null,
    };
  });

  const coverUrl =
    albums.find((a) => a.coverUrl)?.coverUrl ??
    null;

  const hot100Rows = resolvedChartRows.filter((row) => /hot\s*100/i.test(row.chart_name.trim()));
  const chartRunRows = hot100Rows.length > 0 ? hot100Rows : resolvedChartRows;
  const chartRunLabel =
    chartRunRows[0]?.chart_name.trim().replace(/^Billboard\s+/i, "") ?? "Hot 100";

  const trajectoryWeeks = chartsToTrajectoryWeeks(
    chartRunRows.map((row) => ({
      chart_date: row.chart_date.slice(0, 10),
      chart_position: row.chart_position,
      weeks_on_chart: row.weeks_on_chart,
    })),
  );

  const relatedTracks: TrackRelatedSong[] = relatedRows.map((row) => ({
    rvtr: row.track_id,
    title: formatCanonicalTitle(row.canonical_title),
    releaseYear: yearFromDate(row.first_chart_date),
    peakHot100: row.peak_hot100_position,
    href: trackPageHref(row.track_id),
    coverUrl,
  }));

  const rvYear =
    releaseYear ??
    yearFromDate(trajectoryWeeks[0]?.issueDate ?? track.first_chart_date);

  const peakWeekDate =
    (typeof track.peak_hot100_position === "number"
      ? trajectoryWeeks.find((w) => w.rank === track.peak_hot100_position)?.issueDate
      : null) ??
    trajectoryWeeks[trajectoryWeeks.length - 1]?.issueDate ??
    track.first_chart_date;

  return {
    rvtr,
    title,
    artistName,
    artistSlug,
    artistHref: `/artist/${artistSlug}`,
    releaseYear: rvYear,
    peakHot100: track.peak_hot100_position,
    chartWeeks: track.chart_weeks,
    firstChartDate: track.first_chart_date?.slice(0, 10) ?? null,
    coverUrl,
    hasHot100: track.has_hot100,
    hasVdjMedia: coverageMap.get(rvtr) === "owned",
    albums,
    trajectoryWeeks,
    chartRunLabel,
    relatedTracks,
    rvYearHref: rvChronologyHrefFromChartDate(
      peakWeekDate ?? track.first_chart_date,
      rvYear,
    ),
  };
}

/** Dedupes metadata + page within one request. */
export const loadTrackPage = cache(loadTrackPageImpl);
