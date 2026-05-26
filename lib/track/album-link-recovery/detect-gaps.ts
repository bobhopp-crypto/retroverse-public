import { inspectQuery } from "@/lib/inspect/pg";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import type {
  AlbumLinkGapKind,
  ScoredAlbumLinkCandidate,
} from "@/lib/track/album-link-recovery/types";

/** On-the-fly healing input — attach to track page loader later (no UI yet). */
export type TrackHealingGaps = {
  rvtr: string;
  gaps: AlbumLinkGapKind[];
  missingAlbumLinks: boolean;
  missingCover: boolean;
  albumLinkCount: number;
  topCandidates: ScoredAlbumLinkCandidate[];
  diagnosis: string[];
};

export async function detectTrackHealingGaps(
  rvtrInput: string,
): Promise<TrackHealingGaps | null> {
  const audit = await auditTrackAlbumLinks(rvtrInput);
  if (!audit) return null;

  const coverRows = await inspectQuery<{ has_cover: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1 FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
        AND al.canonical_cover_path IS NOT NULL
        AND trim(al.canonical_cover_path) <> ''
    ) AS has_cover
    `,
    [audit.rvtr],
  );
  const linkedCover = coverRows[0]?.has_cover === true;

  const gaps: AlbumLinkGapKind[] = [];
  if (audit.existingLinkCount === 0) gaps.push("missing_album_links");
  if (!linkedCover) gaps.push("missing_cover");

  return {
    rvtr: audit.rvtr,
    gaps,
    missingAlbumLinks: audit.existingLinkCount === 0,
    missingCover: !linkedCover,
    albumLinkCount: audit.existingLinkCount,
    topCandidates: audit.candidates.slice(0, 3),
    diagnosis: audit.diagnosis,
  };
}
