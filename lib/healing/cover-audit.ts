import { inspectQuery } from "@/lib/inspect/pg";
import type { CoverArtworkCandidate, CoverHealingAudit } from "@/lib/healing/types";

type ArtworkRow = {
  link_id: number;
  canonical_cover_path: string | null;
  r2_cover_key: string | null;
  review_flag: string | null;
  confidence_score: number | null;
  source_url: string | null;
};

type LinkedAlbumRow = {
  album_id: number;
  album_title: string;
  artist_name: string;
  canonical_cover_path: string | null;
};

async function loadLinkedAlbum(rvtr: string): Promise<LinkedAlbumRow | null> {
  const rows = await inspectQuery<LinkedAlbumRow>(
    `
    SELECT
      al.id AS album_id,
      al.title AS album_title,
      ar.canonical_name AS artist_name,
      al.canonical_cover_path
    FROM canonical_album_tracks cat
    JOIN albums al ON al.id = cat.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
    ORDER BY cat.position ASC NULLS LAST
    LIMIT 1
    `,
    [rvtr],
  );
  return rows[0] ?? null;
}

async function loadArtworkCandidates(albumId: number): Promise<CoverArtworkCandidate[]> {
  const rows = await inspectQuery<ArtworkRow>(
    `
    SELECT
      aal.id AS link_id,
      aal.canonical_cover_path,
      aal.r2_cover_key,
      aal.review_flag,
      aal.confidence_score,
      aal.source_url
    FROM album_artwork_links aal
    WHERE aal.album_id = $1
    ORDER BY
      (aal.review_flag IN ('curated', 'ok')) DESC,
      aal.confidence_score DESC NULLS LAST,
      aal.updated_at DESC NULLS LAST
    LIMIT 8
    `,
    [albumId],
  );

  return rows.map((r) => ({
    linkId: r.link_id,
    canonicalCoverPath: r.canonical_cover_path?.trim() || null,
    r2CoverKey: r.r2_cover_key?.trim() || null,
    reviewFlag: r.review_flag?.trim() || null,
    confidence: r.confidence_score,
    sourceUrl: r.source_url?.trim() || null,
  }));
}

/** Cover enrichment preview — no writes, routes to curator pipeline for approval. */
export async function auditCoverForRvtr(rvtrInput: string): Promise<CoverHealingAudit> {
  const rvtr = rvtrInput.trim().toUpperCase();
  const linked = await loadLinkedAlbum(rvtr);
  const diagnosis: string[] = [];

  if (!linked) {
    diagnosis.push("No linked album — resolve album link before cover enrichment.");
    return {
      rvtr,
      albumId: null,
      albumTitle: null,
      artistName: null,
      hasCanonicalCover: false,
      candidates: [],
      diagnosis,
    };
  }

  const hasCover =
    linked.canonical_cover_path != null &&
    linked.canonical_cover_path.trim() !== "";
  const candidates = await loadArtworkCandidates(linked.album_id);

  if (hasCover) {
    diagnosis.push(
      `Album ${linked.album_id} "${linked.album_title}" already has canonical_cover_path.`,
    );
  } else {
    diagnosis.push(
      `Album ${linked.album_id} "${linked.album_title}" missing canonical_cover_path.`,
    );
    if (candidates.length === 0) {
      diagnosis.push("No album_artwork_links rows — curator ingest required.");
    } else {
      diagnosis.push(
        `${candidates.length} artwork candidate(s) in album_artwork_links — human approval required (no auto-download).`,
      );
    }
  }

  return {
    rvtr,
    albumId: linked.album_id,
    albumTitle: linked.album_title.trim(),
    artistName: linked.artist_name.trim(),
    hasCanonicalCover: hasCover,
    candidates,
    diagnosis,
  };
}
