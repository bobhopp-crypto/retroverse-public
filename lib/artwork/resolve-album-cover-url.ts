import { coverPathToUrl } from "@/lib/artist/cover-url";

/** Fields returned by album cover queries across public loaders. */
export type AlbumCoverFields = {
  /** albums.canonical_cover_path */
  canonicalCoverPath?: string | null;
  /** Top-ranked album_artwork_links.canonical_cover_path */
  artworkPath?: string | null;
  /** Top-ranked album_artwork_links.r2_cover_key */
  r2CoverKey?: string | null;
};

/** Shorthand for SQL row aliases used in existing queries. */
export type AlbumCoverRow = {
  cover_path?: string | null;
  artwork_path?: string | null;
  r2_cover_key?: string | null;
};

export function albumCoverFieldsFromRow(row: AlbumCoverRow): AlbumCoverFields {
  return {
    canonicalCoverPath: row.cover_path,
    artworkPath: row.artwork_path,
    r2CoverKey: row.r2_cover_key,
  };
}

/**
 * Authoritative public album cover URL resolver.
 *
 * Source priority (matches album page loader):
 * 1. album_artwork_links.canonical_cover_path (curated/ok ranked in SQL)
 * 2. albums.canonical_cover_path
 * 3. album_artwork_links.r2_cover_key
 *
 * Delivery via coverPathToUrl() → R2 CDN or configured base.
 */
export function resolveAlbumCoverUrl(fields: AlbumCoverFields): string | null {
  const candidates = [
    fields.artworkPath,
    fields.canonicalCoverPath,
    fields.r2CoverKey,
  ];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const url = coverPathToUrl(raw) ?? coverPathToUrl(null, raw);
    if (url) return url;
  }
  return null;
}

export function resolveAlbumCoverUrlFromRow(row: AlbumCoverRow): string | null {
  return resolveAlbumCoverUrl(albumCoverFieldsFromRow(row));
}
