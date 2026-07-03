import { cache } from "react";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import { artistNameFromSlug, displayArtistName, slugFromArtistName } from "@/lib/artist/slug";
import { normalizeHomeSearchPayload } from "@/lib/search/map-home-search";
import type { ArtistAlbumCard } from "@/lib/artist/types";

const RE_RVAL_HREF = /\/albums\/(RVAL\d{6})/i;
const ALBUMS_LIMIT = 500;

export type ArtistAlbumsData = {
  slug: string;
  displayName: string;
  albums: ArtistAlbumCard[];
};

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  return resolveAlbumCoverUrlFromRow({
    cover_path: candidates[0],
    artwork_path: candidates[1],
    r2_cover_key: candidates[2],
  });
}

function fallbackAlbums(slugParam: string): ArtistAlbumsData {
  const key = slugParam.trim().toLowerCase();
  const knownName = artistNameFromSlug(key);
  const displayName = knownName
    ? displayArtistName(knownName)
    : displayArtistName(key.replace(/-/g, " "));

  return {
    slug: key || slugFromArtistName(displayName),
    displayName,
    albums: [],
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

async function loadArtistAlbumsImpl(slug: string): Promise<ArtistAlbumsData> {
  const ping = await inspectPing();
  if (!ping.ok) return fallbackAlbums(slug);

  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) return fallbackAlbums(slug);

  const { artistId, canonicalName, displayName, slug: canonicalSlug } = resolved;

  const [albumRows, homeSearch] = await Promise.all([
    inspectQuery<{
      pg_album_id: number;
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
        ) AS r2_cover_key
      FROM albums al
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE al.artist_id = $1
      GROUP BY al.id, al.title, al.release_year, aek.external_key, al.canonical_cover_path
      ORDER BY al.release_year ASC NULLS LAST, al.title ASC
      LIMIT ${ALBUMS_LIMIT}
      `,
      [artistId],
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

  const albums: ArtistAlbumCard[] = albumRows.map((a) => {
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

  return { slug: canonicalSlug, displayName, albums };
}

export const loadArtistAlbums = cache(loadArtistAlbumsImpl);
