import { inspectQuery } from "@/lib/inspect/pg";
import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { WINNING_ARTWORK_LINK_ORDER } from "@/lib/artwork/winning-artwork-link-sql";
import type { RelatedArtistCard } from "@/lib/artist/types";

type CoChartRow = {
  artist_id: number;
  canonical_name: string;
  co_weeks: number;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
};

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  return resolveAlbumCoverUrlFromRow({
    cover_path: candidates[0],
    artwork_path: candidates[1],
    r2_cover_key: candidates[2],
  });
}

/** Chart co-occurrence neighbors — deterministic PG fallback when welcome search is unavailable. */
export async function loadRelatedArtistsFromGraph(
  artistId: number,
  excludeSlug: string,
  limit = 4,
): Promise<RelatedArtistCard[]> {
  const rows = await inspectQuery<CoChartRow>(
    `
    SELECT
      ar2.id AS artist_id,
      ar2.canonical_name,
      count(*)::int AS co_weeks,
      (
        SELECT al.canonical_cover_path
        FROM albums al
        WHERE al.artist_id = ar2.id
          AND al.canonical_cover_path IS NOT NULL
          AND trim(al.canonical_cover_path) <> ''
        ORDER BY al.release_year DESC NULLS LAST
        LIMIT 1
      ) AS cover_path,
      (
        SELECT aal.canonical_cover_path
        FROM albums al
        JOIN album_artwork_links aal ON aal.album_id = al.id
        WHERE al.artist_id = ar2.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key
        FROM albums al
        JOIN album_artwork_links aal ON aal.album_id = al.id
        WHERE al.artist_id = ar2.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS r2_cover_key
    FROM chart_appearances ca1
    JOIN tracks t1 ON t1.id = ca1.track_id
    JOIN chart_appearances ca2
      ON ca2.chart_date = ca1.chart_date
      AND ca2.chart_name = ca1.chart_name
      AND ca2.track_id <> ca1.track_id
    JOIN tracks t2 ON t2.id = ca2.track_id
    JOIN artists ar2 ON ar2.id = t2.artist_id
    WHERE t1.artist_id = $1
      AND t2.artist_id <> $1
      AND ca1.chart_name = 'Billboard Hot 100'
    GROUP BY ar2.id, ar2.canonical_name
    ORDER BY co_weeks DESC, ar2.canonical_name ASC
    LIMIT $2
    `,
    [artistId, limit + 4],
  );

  const seen = new Set<string>([excludeSlug]);
  const out: RelatedArtistCard[] = [];

  for (const row of rows) {
    const name = row.canonical_name?.trim();
    if (!name) continue;
    const artistId = Number(row.artist_id);
    if (!Number.isSafeInteger(artistId) || artistId <= 0) continue;
    const slug = String(artistId);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      artistId,
      name,
      slug,
      coverUrl: pickCoverUrl(row.cover_path, row.artwork_path, row.r2_cover_key),
    });
    if (out.length >= limit) break;
  }

  return out;
}
