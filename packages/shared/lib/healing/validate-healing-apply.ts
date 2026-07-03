import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import type {
  AlbumLinkApplyRequest,
  HealingApplyPreviousState,
} from "@/lib/healing/types";
import {
  validateAlbumLinkProposalBase,
  type GuardrailResult,
} from "@/lib/track/album-link-recovery/guardrails";
import {
  countRvtrAlbumMemberships,
  loadAlbumSlotAtPosition,
  resolveAlbumRelationshipMode,
  rvtrLinkedAlbumIds,
  type AlbumRelationshipMode,
} from "@/lib/track/album-link-recovery/rvtr-album-membership";
import type { AlbumLinkWriteProposal } from "@/lib/track/album-link-recovery/types";

export type HealingApplyValidation =
  | {
      ok: true;
      linkMode: AlbumRelationshipMode;
      proposal: AlbumLinkWriteProposal;
      previousState: HealingApplyPreviousState;
      albumTitle: string;
      anchorCatRowId: number | null;
      slotRvtr: string | null;
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

  const linkedAlbumIds = await rvtrLinkedAlbumIds(rvtr);

  let hasCanonicalCover = false;
  if (linkedAlbumIds.length > 0) {
    const coverRows = await inspectQuery<{ ok: boolean }>(
      `
      SELECT true AS ok
      FROM albums al
      WHERE al.id = ANY($1::int[])
        AND (
          coalesce(al.canonical_cover_path, '') <> ''
          OR EXISTS (
            SELECT 1 FROM album_artwork_links aal
            WHERE aal.album_id = al.id
              AND (coalesce(aal.canonical_cover_path, '') <> '' OR coalesce(aal.r2_cover_key, '') <> '')
          )
        )
      LIMIT 1
      `,
      [linkedAlbumIds],
    );
    hasCanonicalCover = coverRows.length > 0;
  }

  const catCount = await inspectQuery<{ c: number }>(
    `
    SELECT count(*)::int AS c
    FROM canonical_album_tracks
    WHERE upper(trim(canonical_track_key)) = upper(trim($1))
    `,
    [rvtr],
  );

  return {
    rvtr,
    trackTitle: track.canonical_title.trim(),
    artistName: track.canonical_artist_name.trim(),
    albumLinkCount: catCount[0]?.c ?? 0,
    linkedAlbumIds,
    hasCanonicalCover,
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

/** Pre-write validation — RVTR + album existence, tracklist slot or co-album membership. */
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

  const base = validateAlbumLinkProposalBase(proposal);
  if (!base.ok) return base;

  const slot = await loadAlbumSlotAtPosition(proposal.albumId, proposal.position);
  const membershipCount = await countRvtrAlbumMemberships(rvtr);

  const resolved = resolveAlbumRelationshipMode({
    proposal,
    existingLinkCount: previousState.albumLinkCount,
    existingMembershipCount: membershipCount,
    slotRvtr: slot?.rvtr || null,
    slotTitle: slot?.sequence_title ?? null,
    trackTitle: previousState.trackTitle,
  });

  if (!resolved.ok) {
    return {
      ok: false,
      code: resolved.code,
      message: resolved.message,
    };
  }

  return {
    ok: true,
    linkMode: resolved.mode,
    proposal,
    previousState,
    albumTitle: album.title,
    anchorCatRowId: slot?.cat_row_id ?? null,
    slotRvtr: slot?.rvtr || null,
  };
}
