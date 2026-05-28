import { inspectQuery } from "@/lib/inspect/pg";

export type AlbumCoverRow = {
  albumId: number;
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  canonicalCoverPath: string | null;
  trustTierHint: string | null;
};

export async function loadAlbumByRval(rval: string): Promise<AlbumCoverRow | null> {
  const id = rval.trim().toUpperCase();
  const rows = await inspectQuery<{
    album_id: number;
    rval: string;
    artist: string;
    album: string;
    release_year: number | null;
    canonical_cover_path: string | null;
  }>(
    `
    SELECT
      al.id AS album_id,
      upper(trim(aek.external_key)) AS rval,
      ar.canonical_name AS artist,
      al.title AS album,
      al.release_year,
      nullif(trim(al.canonical_cover_path), '') AS canonical_cover_path
    FROM album_external_keys aek
    JOIN albums al ON al.id = aek.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE upper(trim(aek.external_key)) = $1
    LIMIT 1
    `,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    albumId: row.album_id,
    rval: row.rval,
    artist: row.artist.trim(),
    album: row.album.trim(),
    releaseYear: row.release_year,
    canonicalCoverPath: row.canonical_cover_path,
    trustTierHint: null,
  };
}
