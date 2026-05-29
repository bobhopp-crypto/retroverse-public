import { welcomeHref } from "@/lib/control-center/welcome-base";
import { inspectQuery } from "@/lib/inspect/pg";
import {
  chartRelevanceFromPeak,
  classifyAlbumCoverState,
  type AlbumCoverState,
} from "@/lib/ops/cover-status";
import type { OpsQueueMissingArtworkRow } from "@/lib/ops/types";

const LIMIT = 75;

type MissingArtworkRow = {
  pg_album_id: number;
  rval: string | null;
  title: string;
  artist_name: string;
  release_year: number | null;
  canonical_cover_path: string | null;
  link_cover: string | null;
  r2_cover_key: string | null;
  review_flag: string | null;
  b200_peak: number | null;
};

export async function loadMissingArtworkQueue(): Promise<OpsQueueMissingArtworkRow[]> {
  const rows = await inspectQuery<MissingArtworkRow>(
    `
    SELECT
      al.id AS pg_album_id,
      aek.external_key AS rval,
      al.title,
      ar.canonical_name AS artist_name,
      al.release_year,
      al.canonical_cover_path,
      art.link_cover,
      art.r2_cover_key,
      art.review_flag,
      chart.b200_peak
    FROM albums al
    JOIN artists ar ON ar.id = al.artist_id
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id
    LEFT JOIN LATERAL (
      SELECT
        aal.canonical_cover_path AS link_cover,
        aal.r2_cover_key,
        aal.review_flag
      FROM album_artwork_links aal
      WHERE aal.album_id = al.id
      ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
        aal.confidence_score DESC NULLS LAST,
        aal.updated_at DESC NULLS LAST
      LIMIT 1
    ) art ON true
    LEFT JOIN LATERAL (
      SELECT min(ca.chart_position) AS b200_peak
      FROM chart_appearances ca
      WHERE ca.album_id = al.id
        AND ca.chart_name = 'Billboard 200'
    ) chart ON true
    WHERE coalesce(nullif(trim(art.r2_cover_key), ''), '') = ''
    ORDER BY chart.b200_peak ASC NULLS LAST, al.release_year DESC NULLS LAST, al.title
    LIMIT $1
    `,
    [LIMIT],
  );

  return rows.map((row) => {
    const coverStatus = classifyAlbumCoverState(
      row.canonical_cover_path,
      row.link_cover,
      row.r2_cover_key,
      row.review_flag,
    ) as AlbumCoverState;

    const rval = row.rval?.trim().toUpperCase() || null;
    const curatorHref = rval
      ? welcomeHref(`/albums/${rval}`)
      : welcomeHref("/integrity");

    return {
      id: `art-${row.pg_album_id}`,
      album: row.title.trim(),
      artist: row.artist_name.trim(),
      year: row.release_year,
      albumId: rval,
      coverStatus,
      chartRelevance: chartRelevanceFromPeak(row.b200_peak),
      curatorHref,
    };
  });
}
