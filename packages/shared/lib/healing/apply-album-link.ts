import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { appendHealingAudit } from "@/lib/healing/file-audit-log";
import { revalidateHealingEntities } from "@/lib/healing/revalidate-healing-entity";
import type { AlbumLinkApplyRequest } from "@/lib/healing/types";
import {
  loadHealingApplyPreviousState,
  validateHealingAlbumLinkApply,
} from "@/lib/healing/validate-healing-apply";
import {
  applyApprovedAlbumLinkProposal,
  type ApplyProposalResult,
} from "@/lib/track/album-link-recovery/apply-proposal";
import { applyCoAlbumMembership } from "@/lib/track/album-link-recovery/rvtr-album-membership";

export type HealingApplyResult = ApplyProposalResult & {
  revalidated?: boolean;
  revalidatedPaths?: string[];
  linkMode?: "tracklist_slot" | "co_album_membership";
  membershipId?: number;
};

export async function applyHealingAlbumLink(
  request: AlbumLinkApplyRequest,
  actor: string,
): Promise<HealingApplyResult> {
  const validation = await validateHealingAlbumLinkApply(request);
  if (!validation.ok) {
    await appendHealingAudit({
      action: "apply",
      rvtr: request.rvtr.trim().toUpperCase(),
      albumId: request.albumId,
      confidence: request.confidence,
      actor,
      ok: false,
      message: validation.message,
      reasons: request.reasons,
    });
    return validation;
  }

  const { proposal, previousState, linkMode, anchorCatRowId } = validation;

  const result =
    linkMode === "co_album_membership"
      ? await (async () => {
          const co = await applyCoAlbumMembership(proposal, actor, anchorCatRowId);
          if (!co.ok) return co;
          return {
            ok: true as const,
            proposalId: co.proposalId,
            catRowId: co.membershipId,
          };
        })()
      : await applyApprovedAlbumLinkProposal(proposal, actor);

  if (!result.ok) {
    await appendHealingAudit({
      action: "apply",
      rvtr: proposal.rvtr,
      albumId: proposal.albumId,
      confidence: proposal.confidence,
      actor,
      ok: false,
      message: result.message,
      reasons: proposal.reasons,
      previousState,
    });
    return result;
  }

  const paths = await revalidateHealingEntities(proposal.rvtr, proposal.albumId);
  const revalidatedPaths = [paths.track, paths.album, paths.artist].filter(
    (p): p is string => Boolean(p),
  );

  const successMessage =
    linkMode === "co_album_membership"
      ? "Attached RVTR to canonical album via co-album membership."
      : "Applied canonical_album_tracks row (healing_approved).";

  await appendHealingAudit({
    action: "apply",
    rvtr: proposal.rvtr,
    albumId: proposal.albumId,
    proposalId: result.proposalId,
    catRowId: result.catRowId,
    confidence: proposal.confidence,
    actor,
    ok: true,
    message: successMessage,
    reasons: proposal.reasons,
    previousState,
    revalidatedPaths,
  });

  return {
    ...result,
    revalidated: true,
    revalidatedPaths,
    linkMode,
    membershipId: linkMode === "co_album_membership" ? result.catRowId : undefined,
  };
}

export type RollbackResult =
  | { ok: true; proposalId: number; catRowId: number; revalidatedPaths: string[] }
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
    album_id: number;
    status: string;
    applied_cat_row_id: number | null;
  }>(
    `
    SELECT id, rvtr, album_id, status, applied_cat_row_id
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

  const previousState = await loadHealingApplyPreviousState(row.rvtr);

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
  const paths = await revalidateHealingEntities(rvtr, row.album_id);
  const revalidatedPaths = [paths.track, paths.album, paths.artist].filter(
    (p): p is string => Boolean(p),
  );

  await appendHealingAudit({
    action: "rollback",
    rvtr,
    albumId: row.album_id,
    proposalId,
    catRowId: row.applied_cat_row_id,
    actor,
    ok: true,
    message: "Rolled back healing-approved canonical_album_tracks row.",
    previousState: previousState ?? undefined,
    revalidatedPaths,
  });

  return { ok: true, proposalId, catRowId: row.applied_cat_row_id, revalidatedPaths };
}
