import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import type {
  AlbumLinkApplyRequest,
  HealingApplyPreviousState,
} from "@/lib/healing/types";
import {
  validateAlbumLinkProposal,
  type GuardrailResult,
} from "@/lib/track/album-link-recovery/guardrails";
import type { AlbumLinkWriteProposal } from "@/lib/track/album-link-recovery/types";

export type HealingApplyValidation =
  | {
      ok: true;
      proposal: AlbumLinkWriteProposal;
      previousState: HealingApplyPreviousState;
      albumTitle: string;
    }
  | ({ ok: false } & GuardrailResult);

export async function loadHealingApplyPreviousState(
  rvtrInput: string,
): Promise<HealingApplyPreviousState | null> {
  const rvtr = rvtrInput.trim().toUpperCase();
  const trackRows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    canonical_artist_name: string;
  }>(
    `
    SELECT track_id, canonical_title, canonical_artist_name
    FROM canonical_track_display
    WHERE upper(trim(track_id)) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr],
  );
  const track = trackRows[0];
  if (!track) return null;

  const linkRows = await inspectQuery<{ album_id: number; has_cover: boolean }>(
    `
    SELECT
      cat.album_id,
      (al.canonical_cover_path IS NOT NULL AND trim(al.canonical_cover_path) <> '') AS has_cover
    FROM canonical_album_tracks cat
    JOIN albums al ON al.id = cat.album_id
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
  `,
    [rvtr],
  );

  return {
    rvtr,
    trackTitle: track.canonical_title.trim(),
    artistName: track.canonical_artist_name.trim(),
    albumLinkCount: linkRows.length,
    linkedAlbumIds: linkRows.map((r) => r.album_id),
    hasCanonicalCover: linkRows.some((r) => r.has_cover),
  };
}

async function albumExists(albumId: number): Promise<{ id: number; title: string } | null> {
  const rows = await inspectQuery<{ id: number; title: string }>(
    `SELECT id, title FROM albums WHERE id = $1 LIMIT 1`,
    [albumId],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, title: row.title.trim() };
}

/** Pre-write validation — RVTR + album existence, no duplicate link, guardrails. */
export async function validateHealingAlbumLinkApply(
  request: AlbumLinkApplyRequest,
): Promise<HealingApplyValidation> {
  const rvtr = request.rvtr.trim().toUpperCase();
  const previousState = await loadHealingApplyPreviousState(rvtr);
  if (!previousState) {
    return { ok: false, code: "rvtr_not_found", message: "RVTR not found in canonical_track_display." };
  }

  const album = await albumExists(request.albumId);
  if (!album) {
    return { ok: false, code: "album_not_found", message: `Album id ${request.albumId} does not exist.` };
  }

  if (previousState.linkedAlbumIds.includes(request.albumId)) {
    return {
      ok: false,
      code: "duplicate_relationship",
      message: "This RVTR is already linked to that album.",
    };
  }

  const proposal: AlbumLinkWriteProposal = {
    rvtr,
    albumId: request.albumId,
    position: request.position ?? null,
    sequenceTitle: request.sequenceTitle.trim(),
    confidence: request.confidence,
    reasons: request.reasons,
    sourceKind: request.sourceKind,
  };

  const slot = await inspectQuery<{ rvtr: string | null }>(
    `
    SELECT upper(trim(canonical_track_key)) AS rvtr
    FROM canonical_album_tracks
    WHERE album_id = $1 AND position = $2
    LIMIT 1
    `,
    [proposal.albumId, proposal.position ?? 0],
  );

  const guard = validateAlbumLinkProposal(
    proposal,
    previousState.albumLinkCount,
    slot[0]?.rvtr ?? null,
  );
  if (!guard.ok) return guard;

  return { ok: true, proposal, previousState, albumTitle: album.title };
}
