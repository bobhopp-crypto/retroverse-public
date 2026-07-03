import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import type { CoverInventoryRow } from "@/lib/cover-integrity/types";

type PgCoverRow = {
  rval: string;
  album_id: number;
  artist: string;
  album: string;
  release_year: number | null;
  canonical_cover_path: string | null;
  artwork_source: string | null;
  link_confidence: number | null;
  review_flag: string | null;
  b200_peak: number | null;
};

export async function loadCoverInventoryFromPg(): Promise<CoverInventoryRow[]> {
  const ping = await inspectPing();
  if (!ping.ok) {
    throw new Error(`Postgres unavailable: ${ping.error ?? "unknown"}`);
  }

  const rows = await inspectQuery<PgCoverRow>(
    `
    SELECT
      upper(trim(aek.external_key)) AS rval,
      al.id AS album_id,
      ar.canonical_name AS artist,
      al.title AS album,
      al.release_year,
      nullif(trim(al.canonical_cover_path), '') AS canonical_cover_path,
      link.artwork_source,
      link.link_confidence,
      link.review_flag,
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak
    FROM album_external_keys aek
    JOIN albums al ON al.id = aek.album_id
    JOIN artists ar ON ar.id = al.artist_id
    LEFT JOIN chart_appearances ca ON ca.album_id = al.id
    LEFT JOIN LATERAL (
      SELECT
        aal.source AS artwork_source,
        aal.confidence_score AS link_confidence,
        aal.review_flag
      FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ORDER BY
        (aal.review_flag IN ('curated', 'ok')) DESC,
        aal.confidence_score DESC NULLS LAST,
        aal.updated_at DESC NULLS LAST
      LIMIT 1
    ) link ON true
    WHERE aek.external_key ~* '^RVAL\\d{6}$'
    GROUP BY
      aek.external_key,
      al.id,
      ar.canonical_name,
      al.title,
      al.release_year,
      al.canonical_cover_path,
      link.artwork_source,
      link.link_confidence,
      link.review_flag
    ORDER BY aek.external_key
    `,
  );

  return rows.map((r) => ({
    rval: r.rval.trim().toUpperCase(),
    albumId: r.album_id,
    artist: r.artist.trim(),
    album: r.album.trim(),
    releaseYear: r.release_year,
    canonicalPath: r.canonical_cover_path,
    coverFilename: null,
    artworkSource: r.artwork_source?.trim() || null,
    linkConfidence: r.link_confidence,
    reviewFlag: r.review_flag?.trim() || null,
    b200Peak: r.b200_peak,
  }));
}
