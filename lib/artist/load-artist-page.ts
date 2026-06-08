import { cache } from "react";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import {
  artistFileCode,
  artistNameFromSlug,
  displayArtistName,
  slugFromArtistName,
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
import { normalizeHomeSearchPayload } from "@/lib/search/map-home-search";

const RE_RVAL_HREF = /\/albums\/(RVAL\d{6})/i;

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
  const key = slugParam.trim().toLowerCase();
  const knownName = artistNameFromSlug(key);
  const displayName = knownName
    ? displayArtistName(knownName)
    : displayArtistName(key.replace(/-/g, " "));

  return {
    slug: key || slugFromArtistName(displayName),
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
    exploreLinks: [
      { label: "Search catalog", href: `/search?q=${encodeURIComponent(displayName)}` },
      { label: "Inspect graph", href: `/inspect?q=${encodeURIComponent(displayName)}` },
    ],
  };
}

async function fetchHomeSearch(name: string) {
  const base =
    process.env.SEARCH_UPSTREAM_BASE_URL?.trim() ||
    process.env.RETROVERSE_WELCOME_URL?.trim() ||
    "http://localhost:3000";
  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/api/home-search?q=${encodeURIComponent(name)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return normalizeHomeSearchPayload(await res.json(), name);
  } catch {
    return null;
  }
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

  const [albumRows, trackRows, yearRows, decadeRows, statsRows, homeSearch] = await Promise.all([
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
          ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
          LIMIT 1
        ) AS artwork_path,
        (
          SELECT aal.r2_cover_key FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
          LIMIT 1
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
    inspectQuery<{
      track_id: string;
      canonical_title: string;
      peak_hot100_position: number | null;
      chart_weeks: number;
      first_chart_date: string | null;
      has_vdj_media: boolean;
    }>(
      `
      SELECT track_id, canonical_title, peak_hot100_position, chart_weeks,
             first_chart_date::text AS first_chart_date, has_vdj_media
      FROM canonical_track_display
      WHERE lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i'))
        = lower(regexp_replace(trim($1), '^the\\s+', '', 'i'))
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 12
      `,
      [canonicalName],
    ),
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
          WHERE lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\\s+', '', 'i'))
            = lower(regexp_replace(trim($2), '^the\\s+', '', 'i'))
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
          WHERE lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\\s+', '', 'i'))
            = lower(regexp_replace(trim($2), '^the\\s+', '', 'i'))
            AND ctd.has_vdj_media) AS library_tracks
      `,
      [artistId, canonicalName],
    ),
    fetchHomeSearch(canonicalName),
  ]);

  const coverFromSearch = new Map<string, string>();
  if (homeSearch) {
    for (const a of homeSearch.albums) {
      const m = a.href.match(RE_RVAL_HREF);
      if (m && a.coverUrl) coverFromSearch.set(m[1]!.toUpperCase(), a.coverUrl);
    }
  }

  const essentialAlbums: ArtistAlbumCard[] = albumRows.map((a) => {
    const rval = a.rval?.toUpperCase() ?? null;
    const coverUrl =
      (rval ? coverFromSearch.get(rval) : null) ??
      pickCoverUrl(a.cover_path, a.artwork_path, a.r2_cover_key);
    return {
      pgAlbumId: a.pg_album_id,
      title: a.title,
      releaseYear: a.release_year,
      rval,
      b200Peak: a.b200_peak,
      coverUrl,
    };
  });

  const albumCoverByRval = new Map(
    essentialAlbums.filter((a) => a.rval && a.coverUrl).map((a) => [a.rval!, a.coverUrl!]),
  );
  const fallbackAlbumCover = essentialAlbums.find((a) => a.coverUrl)?.coverUrl ?? null;

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
      coverUrl: fallbackAlbumCover,
    };
  });

  const rvtrs = signatureTracks.map((t) => t.rvtr);
  if (rvtrs.length > 0) {
    const linkRows = await inspectQuery<{ track_key: string; rval: string }>(
      `
      SELECT DISTINCT ON (cat.canonical_track_key)
        cat.canonical_track_key AS track_key,
        aek.external_key AS rval
      FROM canonical_album_tracks cat
      JOIN album_external_keys aek ON aek.album_id = cat.album_id
      WHERE cat.canonical_track_key = ANY($1::text[])
      ORDER BY cat.canonical_track_key, cat.position
      `,
      [rvtrs],
    );
    const rvalByTrack = new Map(
      linkRows.map((r) => [r.track_key.toUpperCase(), r.rval.toUpperCase()]),
    );
    for (const tr of signatureTracks) {
      const rval = rvalByTrack.get(tr.rvtr.toUpperCase());
      if (rval && albumCoverByRval.has(rval)) tr.coverUrl = albumCoverByRval.get(rval)!;
    }
  }

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
  if (homeSearch) {
    const seenSlugs = new Set<string>([canonicalSlug]);
    for (const a of homeSearch.artists) {
      if (a.name.toLowerCase() === canonicalName.toLowerCase()) continue;
      const s = slugFromArtistName(a.name);
      if (seenSlugs.has(s)) continue;
      seenSlugs.add(s);
      relatedArtists.push({
        name: a.name,
        slug: s,
        coverUrl: a.coverUrl ?? null,
      });
      if (relatedArtists.length >= 4) break;
    }
  }
  if (relatedArtists.length === 0) {
    relatedArtists.push(
      ...(await loadRelatedArtistsFromGraph(artistId, canonicalSlug, 4)),
    );
  }

  const heroFromSearch =
    homeSearch?.artists.find(
      (a) => a.name.trim().toLowerCase() === canonicalName.trim().toLowerCase(),
    )?.coverUrl ?? null;
  const heroImageUrl =
    heroFromSearch ??
    essentialAlbums.find((a) => a.b200Peak != null && a.coverUrl)?.coverUrl ??
    essentialAlbums.find((a) => a.coverUrl)?.coverUrl ??
    homeSearch?.albums.find((a) => a.coverUrl)?.coverUrl ??
    null;

  const libraryTracks = stats?.library_tracks ?? trackRows.filter((t) => t.has_vdj_media).length;
  const libraryAlbums = essentialAlbums.filter((a) => a.coverUrl).length;

  const exploreRaw: { label: string; href: string }[] = [
    { label: "Search catalog", href: `/search?q=${encodeURIComponent(displayName)}` },
    { label: "Inspect graph", href: `/inspect?q=${encodeURIComponent(displayName)}` },
    ...(chartAlbumSpotlight
      ? [
          {
            label: chartAlbumSpotlight.albumTitle,
            href: `/search?q=${encodeURIComponent(`${displayName} ${chartAlbumSpotlight.albumTitle}`)}`,
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
