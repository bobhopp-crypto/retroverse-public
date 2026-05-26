import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import {
  healingWritesEnabled,
  validateAlbumLinkProposal,
} from "@/lib/track/album-link-recovery/guardrails";
import type { AlbumLinkWriteProposal } from "@/lib/track/album-link-recovery/types";

export type ApplyProposalResult =
  | { ok: true; proposalId: number; catRowId: number }
  | { ok: false; code: string; message: string };

/**
 * Human-approved write path — disabled by default.
 * Requires RETROVERSE_HEALING_APPLY=1 and track_album_link_proposals table.
 */
export async function applyApprovedAlbumLinkProposal(
  proposal: AlbumLinkWriteProposal,
  approvedBy: string,
): Promise<ApplyProposalResult> {
  if (!healingWritesEnabled()) {
    return {
      ok: false,
      code: "writes_disabled",
      message: "Set RETROVERSE_HEALING_APPLY=1 to enable healing writes.",
    };
  }

  const rvtr = proposal.rvtr.trim().toUpperCase();
  const existing = await inspectQuery<{ c: number }>(
    `
    SELECT count(*)::int AS c FROM canonical_album_tracks
    WHERE upper(trim(canonical_track_key)) = upper(trim($1))
    `,
    [rvtr],
  );
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
    existing[0]?.c ?? 0,
    slot[0]?.rvtr ?? null,
  );
  if (!guard.ok) return guard;

  const logRows = await inspectQuery<{ id: number }>(
    `
    INSERT INTO track_album_link_proposals (
      rvtr, album_id, position, sequence_title, confidence, reasons, source_kind,
      status, proposed_by, reviewed_by, reviewed_at
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'applied', $8, $8, now())
    RETURNING id
    `,
    [
      rvtr,
      proposal.albumId,
      proposal.position,
      proposal.sequenceTitle,
      proposal.confidence,
      JSON.stringify(proposal.reasons),
      proposal.sourceKind,
      approvedBy,
    ],
  );
  const proposalId = logRows[0]?.id;
  if (!proposalId) {
    return { ok: false, code: "log_failed", message: "Could not log proposal." };
  }

  const catRows = await inspectQuery<{ id: number }>(
    `
    INSERT INTO canonical_album_tracks (
      album_id, position, title, canonical_track_key,
      canonical_source, confidence_score, review_flag
    ) VALUES ($1, $2, $3, $4, 'healing_approved', $5, 'curated')
    RETURNING id
    `,
    [
      proposal.albumId,
      proposal.position ?? 1,
      proposal.sequenceTitle,
      rvtr,
      proposal.confidence,
    ],
  );
  const catRowId = catRows[0]?.id;
  if (!catRowId) {
    return { ok: false, code: "insert_failed", message: "INSERT canonical_album_tracks failed." };
  }

  return { ok: true, proposalId, catRowId };
}
