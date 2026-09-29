import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

export type RvtrCoverInfo = {
  rvtr: string;
  coverUrl: string | null;
  coverSource: string | null;
  albumTitle: string | null;
};

/** Batch load canonical cover assignments for RVTRs (Cover Library). */
export async function loadCoverInfoForRvtrs(rvtrs: string[]): Promise<Map<string, RvtrCoverInfo>> {
  const out = new Map<string, RvtrCoverInfo>();
  const unique = [...new Set(rvtrs.map((r) => r.trim().toUpperCase()))].filter(Boolean);
  if (unique.length === 0) return out;

  const ping = await inspectPing();
  if (!ping.ok) return out;

  const rows = await inspectQuery<{
    rvtr: string;
    album_title: string | null;
    cover_path: string | null;
    artwork_path: string | null;
    r2_cover_key: string | null;
    review_flag: string | null;
  }>(
    `
    SELECT DISTINCT ON (rvtr)
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr,
      al.title AS album_title,
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
      (
        SELECT aal.review_flag FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS review_flag
    FROM canonical_track_display ctd
    LEFT JOIN canonical_album_tracks cat ON upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text)))
    LEFT JOIN albums al ON al.id = cat.album_id
    WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) = ANY($1::text[])
    ORDER BY rvtr, cat.position ASC NULLS LAST
    `,
    [unique],
  );

  for (const row of rows) {
    const coverUrl = resolveAlbumCoverUrlFromRow({
      cover_path: row.cover_path,
      artwork_path: row.artwork_path,
      r2_cover_key: row.r2_cover_key,
    });
    let coverSource: string | null = null;
    if (coverUrl) {
      if (row.r2_cover_key) coverSource = "R2 Cover Library";
      else if (row.artwork_path) coverSource = "Album Artwork Link";
      else if (row.cover_path) coverSource = "Album Canonical Cover";
      if (row.review_flag === "curated" || row.review_flag === "ok") {
        coverSource = `${coverSource ?? "Cover"} · ${row.review_flag}`;
      }
    }
    out.set(row.rvtr, {
      rvtr: row.rvtr,
      coverUrl,
      coverSource,
      albumTitle: row.album_title,
    });
  }

  for (const rvtr of unique) {
    if (!out.has(rvtr)) {
      out.set(rvtr, { rvtr, coverUrl: null, coverSource: null, albumTitle: null });
    }
  }

  return out;
}
