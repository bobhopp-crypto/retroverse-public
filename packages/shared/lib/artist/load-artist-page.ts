import { cache } from "react";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { WINNING_ARTWORK_LINK_ORDER } from "@/lib/artwork/winning-artwork-link-sql";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import { loadCanonicalArtistTracks } from "@/lib/artist/load-canonical-artist-tracks";
import {
  artistFileCode,
} from "@/lib/artist/slug";
import type {
  ArtistAlbumCard,
  ArtistPageData,
  ArtistTrackCard,
  ChartAlbumSpotlight,
  ChartDecadeBar,
  DominantYearBar,
  RelatedArtistCard,
} from "@/lib/artist/types";

import {
  loadArtistChartHistory,
  type ArtistChartHistoryScope,
} from "@/lib/artist/load-chart-history";
import { loadRelatedArtistsFromGraph } from "@/lib/artist/load-related-artists";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import { resolveCanonicalTracksBatch } from "@/lib/public/canonical-public-resolver";

function pickCoverUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  return resolveAlbumCoverUrlFromRow({
    cover_path: candidates[0],
    artwork_path: candidates[1],
    r2_cover_key: candidates[2],
  });
}

function fallbackArtistPageData(slugParam: string): ArtistPageData {
  const key = /^\d+$/.test(slugParam.trim()) ? slugParam.trim() : "0";
  const displayName = "Unknown artist";

  return {
    slug: key,
    displayName,
    canonicalName: displayName,
    artistId: 0,
    fileCode: artistFileCode(0, displayName),
    heroImageUrl: null,
    activeRange: "—",
    libraryTracks: 0,
    libraryAlbums: 0,
    essentialAlbums: [],
    signatureTracks: [],
    dominantYears: [],
    chartDecades: [],
    hasDominantYearData: false,
    chartAlbumSpotlight: null,
    chartHighlights: {
      hot100Appearances: 0,
      b200Albums: 0,
      top10Hits: 0,
      top10Albums: 0,
    },
    chartHistory: null,
    relatedArtists: [],
    exploreLinks: key !== "0" ? [{ label: "Artist exhibit", href: `/artist/${key}` }] : [],
  };
}

export type LoadArtistPageOptions = {
  /** Load interactive chart history payload ( `/artist/[slug]/charts` only ). */
  includeChartHistory?: boolean;
  /** `preview` on charts sub-route sample; `full` on /artist/[slug]/charts */
  chartScope?: ArtistChartHistoryScope;
};

async function loadArtistPageImpl(
  slug: string,
  options?: LoadArtistPageOptions,
): Promise<ArtistPageData> {
  const chartScope = options?.chartScope ?? "preview";
  const includeChartHistory = options?.includeChartHistory === true;
  const ping = await inspectPing();
  if (!ping.ok) return fallbackArtistPageData(slug);

  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) return fallbackArtistPageData(slug);

  const { artistId, canonicalName, displayName, slug: canonicalSlug } = resolved;

  const [albumRows, allTrackRows, yearRows, decadeRows, statsRows] = await Promise.all([
    inspectQuery<{
      pg_album_id: number;
      title: string;
      release_year: number | null;
      rval: string | null;
      b200_peak: number | null;
      cover_path: string | null;
      artwork_path: string | null;
      r2_cover_key: string | null;
      sequence_tracks: number;
    }>(
      `
      SELECT
        al.id AS pg_album_id,
        al.title,
        al.release_year,
        aek.external_key AS rval,
        min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak,
        al.canonical_cover_path AS cover_path,
        (
          SELECT aal.canonical_cover_path FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ${WINNING_ARTWORK_LINK_ORDER}
        ) AS artwork_path,
        (
          SELECT aal.r2_cover_key FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ${WINNING_ARTWORK_LINK_ORDER}
        ) AS r2_cover_key,
        count(DISTINCT cat.id)::int AS sequence_tracks
      FROM albums al
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN canonical_album_tracks cat ON cat.album_id = al.id
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE al.artist_id = $1
      GROUP BY al.id, al.title, al.release_year, aek.external_key, al.canonical_cover_path
      ORDER BY al.release_year ASC NULLS LAST, al.title ASC
      LIMIT 24
      `,
      [artistId],
    ),
    loadCanonicalArtistTracks(artistId),
    inspectQuery<{ year: number; count: number }>(
      `
      SELECT extract(year FROM ca.chart_date)::int AS year, count(*)::int AS count
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      WHERE t.artist_id = $1 AND ca.chart_name = 'Billboard Hot 100'
      GROUP BY 1
      HAVING extract(year FROM ca.chart_date)::int IS NOT NULL
      ORDER BY count DESC, year ASC
      LIMIT 8
      `,
      [artistId],
    ),
    inspectQuery<{ decade: number; count: number }>(
      `
      SELECT
        (extract(year FROM ca.chart_date)::int / 10) * 10 AS decade,
        count(*)::int AS count
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      WHERE t.artist_id = $1 AND ca.chart_name = 'Billboard Hot 100'
      GROUP BY 1
      HAVING (extract(year FROM ca.chart_date)::int / 10) * 10 IS NOT NULL
      ORDER BY decade ASC
      `,
      [artistId],
    ),
    inspectQuery<{
      hot100_rows: number;
      top10_hits: number;
      b200_albums: number;
      top10_albums: number;
      min_year: number | null;
      max_year: number | null;
      library_tracks: number;
    }>(
      `
      SELECT
        (SELECT count(*)::int FROM chart_appearances ca
          JOIN tracks t ON t.id = ca.track_id WHERE t.artist_id = $1 AND ca.chart_name = 'Billboard Hot 100') AS hot100_rows,
        (SELECT count(*)::int FROM canonical_track_display ctd
          WHERE ctd.artist_id = $1
            AND ctd.peak_hot100_position IS NOT NULL AND ctd.peak_hot100_position <= 10) AS top10_hits,
        (SELECT count(DISTINCT al.id)::int FROM albums al
          JOIN chart_appearances ca ON ca.album_id = al.id
          WHERE al.artist_id = $1 AND ca.chart_name = 'Billboard 200') AS b200_albums,
        (SELECT count(DISTINCT al.id)::int FROM albums al
          JOIN chart_appearances ca ON ca.album_id = al.id
          WHERE al.artist_id = $1 AND ca.chart_name = 'Billboard 200' AND ca.chart_position <= 10) AS top10_albums,
        (SELECT min(al.release_year)::int FROM albums al WHERE al.artist_id = $1) AS min_year,
        (SELECT max(al.release_year)::int FROM albums al WHERE al.artist_id = $1) AS max_year,
        (SELECT count(*)::int FROM canonical_track_display ctd
          WHERE ctd.artist_id = $1
            AND ctd.has_vdj_media) AS library_tracks
      `,
      [artistId],
    ),
  ]);

  const trackRows = allTrackRows.slice(0, 12);

  const essentialAlbums: ArtistAlbumCard[] = albumRows.map((a) => {
    const rval = a.rval?.toUpperCase() ?? null;
    const coverUrl = pickCoverUrl(a.cover_path, a.artwork_path, a.r2_cover_key);
    return {
      pgAlbumId: a.pg_album_id,
      title: a.title,
      releaseYear: a.release_year,
      rval,
      b200Peak: a.b200_peak,
      coverUrl,
    };
  });

  const fallbackAlbumCover = essentialAlbums.find((a) => a.coverUrl)?.coverUrl ?? null;

  const canonicalSignatureTracks = await resolveCanonicalTracksBatch(
    trackRows.map((track) => track.track_id),
  );

  const signatureTracks: ArtistTrackCard[] = trackRows.map((t) => {
    let releaseYear: number | null = null;
    if (t.first_chart_date) {
      const y = Number(t.first_chart_date.slice(0, 4));
      if (Number.isFinite(y)) releaseYear = y;
    }
    return {
      rvtr: t.track_id,
      title: t.canonical_title,
      releaseYear,
      peakHot100: t.peak_hot100_position,
      chartWeeks: t.chart_weeks,
      coverUrl:
        canonicalSignatureTracks.get(t.track_id.trim().toUpperCase())?.albumResolution
          .primaryAlbum?.coverUrl ?? null,
    };
  });

  const dominantYearsRaw: DominantYearBar[] = yearRows
    .filter((y) => y.year >= 1960 && y.year <= 2030)
    .slice(0, 6)
    .sort((a, b) => a.year - b.year);

  const hasDominantYearData = dominantYearsRaw.length > 0;
  const dominantYears = dominantYearsRaw;
  const chartDecades: ChartDecadeBar[] = decadeRows
    .filter((d) => d.decade >= 1960 && d.decade <= 2030)
    .sort((a, b) => a.decade - b.decade);

  const chartAlbumSpotlightAlbum = essentialAlbums.find((a) => a.b200Peak != null);

  const chartAlbumSpotlight: ChartAlbumSpotlight | null = chartAlbumSpotlightAlbum
    ? {
        albumTitle: chartAlbumSpotlightAlbum.title,
        releaseYear: chartAlbumSpotlightAlbum.releaseYear,
        b200Peak: chartAlbumSpotlightAlbum.b200Peak,
        rval: chartAlbumSpotlightAlbum.rval,
        coverUrl: chartAlbumSpotlightAlbum.coverUrl,
      }
    : null;

  const stats = statsRows[0];
  const minY = stats?.min_year;
  const maxY = stats?.max_year;
  const activeRange =
    minY != null && maxY != null
      ? minY === maxY
        ? String(minY)
        : `${minY}–${maxY}${maxY >= 2018 ? "–Present" : ""}`
      : "—";

  const relatedArtists: RelatedArtistCard[] = [];
  relatedArtists.push(
    ...(await loadRelatedArtistsFromGraph(artistId, canonicalSlug, 4)),
  );

  const heroImageUrl =
    essentialAlbums.find((a) => a.b200Peak != null && a.coverUrl)?.coverUrl ??
    essentialAlbums.find((a) => a.coverUrl)?.coverUrl ??
    null;

  const libraryTracks = stats?.library_tracks ?? trackRows.filter((t) => t.has_vdj_media).length;
  const libraryAlbums = essentialAlbums.filter((a) => a.coverUrl).length;

  const exploreRaw: { label: string; href: string }[] = [
    { label: "Artist exhibit", href: `/artist/${canonicalSlug}` },
    ...(chartAlbumSpotlight
      ? [
          {
            label: chartAlbumSpotlight.albumTitle,
            href:
              albumSuggestionHref(
                chartAlbumSpotlight.albumTitle,
                chartAlbumSpotlight.rval ? `/album/${chartAlbumSpotlight.rval}` : null,
              ) ?? `/artist/${canonicalSlug}#essential-albums`,
          },
        ]
      : []),
  ];
  const exploreLinks = exploreRaw.filter(
    (item, index, arr) => arr.findIndex((x) => x.href === item.href) === index,
  );

  const coverByTrackId = new Map<string, string>();
  for (const tr of signatureTracks) {
    if (tr.coverUrl) coverByTrackId.set(tr.rvtr.toUpperCase(), tr.coverUrl);
  }

  const chartHistory = includeChartHistory
    ? await loadArtistChartHistory(
        artistId,
        displayName,
        coverByTrackId,
        fallbackAlbumCover,
        undefined,
        chartScope,
      )
    : null;

  return {
    slug: canonicalSlug,
    displayName,
    canonicalName,
    artistId,
    fileCode: artistFileCode(artistId, displayName),
    heroImageUrl,
    activeRange,
    libraryTracks,
    libraryAlbums,
    essentialAlbums,
    signatureTracks,
    dominantYears,
    chartDecades,
    hasDominantYearData,
    chartAlbumSpotlight,
    chartHighlights: {
      hot100Appearances: stats?.hot100_rows ?? 0,
      b200Albums: stats?.b200_albums ?? essentialAlbums.filter((a) => a.b200Peak != null).length,
      top10Hits: stats?.top10_hits ?? 0,
      top10Albums: stats?.top10_albums ?? 0,
    },
    chartHistory,
    relatedArtists,
    exploreLinks,
  };
}

/** Dedupes metadata + page (and section routes) within one request. */
export const loadArtistPage = cache(loadArtistPageImpl);
