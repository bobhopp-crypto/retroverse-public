import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { appendHealingAudit } from "@/lib/healing/file-audit-log";
import { revalidateTrackPage } from "@/lib/healing/revalidate-track";
import {
  applyApprovedAlbumLinkProposal,
  type ApplyProposalResult,
} from "@/lib/track/album-link-recovery/apply-proposal";
import type { AlbumLinkApplyRequest } from "@/lib/healing/types";
import type { AlbumLinkWriteProposal } from "@/lib/track/album-link-recovery/types";

export type HealingApplyResult = ApplyProposalResult & {
  revalidated?: boolean;
};

export async function applyHealingAlbumLink(
  request: AlbumLinkApplyRequest,
  actor: string,
): Promise<HealingApplyResult> {
  const proposal: AlbumLinkWriteProposal = {
    rvtr: request.rvtr.trim().toUpperCase(),
    albumId: request.albumId,
    position: request.position ?? null,
    sequenceTitle: request.sequenceTitle,
    confidence: request.confidence,
    reasons: request.reasons,
    sourceKind: request.sourceKind,
    proposedBy: actor,
  };

  const result = await applyApprovedAlbumLinkProposal(proposal, actor);
  await appendHealingAudit({
    action: "apply",
    rvtr: proposal.rvtr,
    albumId: proposal.albumId,
    proposalId: result.ok ? result.proposalId : undefined,
    catRowId: result.ok ? result.catRowId : undefined,
    confidence: proposal.confidence,
    actor,
    ok: result.ok,
    message: result.ok ? "Applied canonical_album_tracks row." : result.message,
    reasons: proposal.reasons,
  });

  if (result.ok) {
    revalidateTrackPage(proposal.rvtr);
    return { ...result, revalidated: true };
  }
  return result;
}

export type RollbackResult =
  | { ok: true; proposalId: number; catRowId: number }
  | { ok: false; code: string; message: string };

/**
 * Roll back a healing-approved insert. Only deletes rows with canonical_source = healing_approved.
 */
export async function rollbackHealingAlbumLink(
  proposalId: number,
  actor: string,
): Promise<RollbackResult> {
  const rows = await inspectQuery<{
    id: number;
    rvtr: string;
    status: string;
    applied_cat_row_id: number | null;
  }>(
    `
    SELECT id, rvtr, status, applied_cat_row_id
    FROM track_album_link_proposals
    WHERE id = $1
    LIMIT 1
    `,
    [proposalId],
  );
  const row = rows[0];
  if (!row) {
    return { ok: false, code: "not_found", message: "Proposal not found." };
  }
  if (row.status !== "applied") {
    return {
      ok: false,
      code: "not_applied",
      message: `Proposal status is ${row.status}, not applied.`,
    };
  }
  if (!row.applied_cat_row_id) {
    return {
      ok: false,
      code: "missing_cat_row",
      message: "No applied_cat_row_id on proposal — cannot rollback safely.",
    };
  }

  const deleted = await inspectQuery<{ id: number }>(
    `
    DELETE FROM canonical_album_tracks
    WHERE id = $1
      AND canonical_source = 'healing_approved'
    RETURNING id
    `,
    [row.applied_cat_row_id],
  );
  if (!deleted[0]) {
    return {
      ok: false,
      code: "delete_failed",
      message: "Could not delete healing row (missing or wrong source).",
    };
  }

  await inspectQuery(
    `
    UPDATE track_album_link_proposals
    SET status = 'rolled_back', reviewed_by = $2, reviewed_at = now()
    WHERE id = $1
    `,
    [proposalId, actor],
  );

  const rvtr = row.rvtr.trim().toUpperCase();
  revalidateTrackPage(rvtr);
  await appendHealingAudit({
    action: "rollback",
    rvtr,
    proposalId,
    catRowId: row.applied_cat_row_id,
    actor,
    ok: true,
    message: "Rolled back healing-approved canonical_album_tracks row.",
  });

  return { ok: true, proposalId, catRowId: row.applied_cat_row_id };
}
