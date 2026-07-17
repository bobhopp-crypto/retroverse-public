import { cache } from "react";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { WINNING_ARTWORK_LINK_ORDER } from "@/lib/artwork/winning-artwork-link-sql";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import type { ArtistAlbumCard } from "@/lib/artist/types";

const ALBUMS_LIMIT = 500;

export type ArtistAlbumsData = {
  slug: string;
  displayName: string;
  albums: ArtistAlbumCard[];
};

export type LoadArtistAlbumsOptions = {
  /** Search already has canonical covers; skip the legacy home-search cover fallback. */
  skipSearchCoverFallback?: boolean;
};

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  return resolveAlbumCoverUrlFromRow({
    cover_path: candidates[0],
    artwork_path: candidates[1],
    r2_cover_key: candidates[2],
  });
}

function fallbackAlbums(slugParam: string): ArtistAlbumsData {
  const key = /^\d+$/.test(slugParam.trim()) ? slugParam.trim() : "0";
  const displayName = "Unknown artist";

  return {
    slug: key,
    displayName,
    albums: [],
  };
}

async function loadArtistAlbumsImpl(
  slug: string,
  _options?: LoadArtistAlbumsOptions,
): Promise<ArtistAlbumsData> {
  const ping = await inspectPing();
  if (!ping.ok) return fallbackAlbums(slug);

  const resolved = await resolveArtistFromSlug(slug);
  if (!resolved) return fallbackAlbums(slug);

  const { artistId, displayName, slug: canonicalSlug } = resolved;

  const albumRows = await inspectQuery<{
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
          ${WINNING_ARTWORK_LINK_ORDER}
        ) AS artwork_path,
        (
          SELECT aal.r2_cover_key FROM album_artwork_links aal
          WHERE aal.album_id = al.id
          ${WINNING_ARTWORK_LINK_ORDER}
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
    );

  const albums: ArtistAlbumCard[] = albumRows.map((a) => {
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

  return { slug: canonicalSlug, displayName, albums };
}

export const loadArtistAlbums = cache(loadArtistAlbumsImpl);
