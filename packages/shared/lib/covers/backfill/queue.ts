import { inspectQuery } from "@/lib/inspect/pg";

import type { BackfillQueueRow } from "@/lib/covers/backfill/types";

export async function loadMissingCoverQueue(): Promise<BackfillQueueRow[]> {
  const rows = await inspectQuery<{
    album_id: number;
    rval: string;
    artist: string;
    album: string;
    release_year: number | null;
    b200_peak: number | null;
  }>(
    `
    SELECT
      al.id AS album_id,
      upper(trim(aek.external_key)) AS rval,
      ar.canonical_name AS artist,
      al.title AS album,
      al.release_year,
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak
    FROM albums al
    JOIN artists ar ON ar.id = al.artist_id
    JOIN album_external_keys aek ON aek.album_id = al.id
    LEFT JOIN chart_appearances ca ON ca.album_id = al.id
    WHERE aek.external_key ~* '^RVAL[0-9]{6}$'
      AND nullif(trim(al.canonical_cover_path), '') IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM album_artwork_links aal
        WHERE aal.album_id = al.id
          AND aal.review_flag IN ('curated', 'ok')
          AND nullif(trim(coalesce(aal.canonical_cover_path, aal.r2_cover_key)), '') IS NOT NULL
      )
    GROUP BY al.id, aek.external_key, ar.canonical_name, al.title, al.release_year
    ORDER BY b200_peak ASC NULLS LAST, al.release_year DESC NULLS LAST, al.title ASC
    `,
  );

  return rows.map((row) => ({
    albumId: Number(row.album_id),
    rval: row.rval,
    artist: row.artist.trim(),
    album: row.album.trim(),
    releaseYear: row.release_year,
    b200Peak: row.b200_peak,
  }));
}

export async function countCoveredRvalAlbums(): Promise<number> {
  const rows = await inspectQuery<{ n: number }>(
    `
    SELECT count(DISTINCT al.id)::int AS n
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE aek.external_key ~* '^RVAL[0-9]{6}$'
      AND nullif(trim(al.canonical_cover_path), '') IS NOT NULL
    `,
  );
  return rows[0]?.n ?? 0;
}
