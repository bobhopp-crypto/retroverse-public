import type { PoolClient } from "pg";

import { appendMbIngestAudit } from "@/lib/healing/mb-ingest/audit";
import {
  buildMbIngestRollbackPlan,
  loadMbIngestProposal,
  MB_INGEST_AEK_SOURCE,
  MB_INGEST_CAT_SOURCE,
  type MbIngestProposalApplyRow,
} from "@/lib/healing/mb-ingest/apply-plan";
import { mbIngestApplyEnabled } from "@/lib/healing/mb-ingest/apply-guard";
import { getInspectPool } from "@/lib/inspect/pg";

export type MbIngestRollbackResult =
  | {
      ok: true;
      proposalId: number;
      albumId: number | null;
      rval: string | null;
      deletedCat: number;
      deletedAek: number;
      deletedAlbum: number;
      idempotent: boolean;
      rvtrsRestored: string[];
    }
  | { ok: false; code: string; message: string };

async function queryClient<T extends Record<string, unknown>>(
  client: PoolClient,
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await client.query(text, params);
  return result.rows as T[];
}

async function rvtrUnlinked(rvtr: string, client?: PoolClient): Promise<boolean> {
  const sql = `
    SELECT 1::int AS hit FROM canonical_album_tracks
    WHERE upper(trim(canonical_track_key)) = upper(trim($1))
    LIMIT 1
  `;
  const rows = client
    ? await queryClient<{ hit: number }>(client, sql, [rvtr])
    : await (await import("@/lib/inspect/pg")).inspectQuery<{ hit: number }>(sql, [rvtr]);
  return rows.length === 0;
}

async function withMbIngestTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getInspectPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Roll back MB ingest apply for a single proposal.
 * Deletes only rows tagged musicbrainz_ingest_approved / musicbrainz_ingest.
 * Idempotent: safe if already rolled_back or rows already removed.
 */
export async function rollbackMbIngest(
  proposalId: number,
  actor = "mb-ingest-rollback",
): Promise<MbIngestRollbackResult> {
  if (!mbIngestApplyEnabled()) {
    return {
      ok: false,
      code: "writes_disabled",
      message: "Set RETROVERSE_MB_INGEST_APPLY=1 to enable MB ingest rollback.",
    };
  }

  const proposal = await loadMbIngestProposal(proposalId);
  if (!proposal) {
    return { ok: false, code: "not_found", message: `Proposal ${proposalId} not found.` };
  }

  if (proposal.status === "rolled_back") {
    await appendMbIngestAudit({
      action: "rollback",
      batchName: proposal.batch_name,
      rvtr: proposal.rvtr,
      proposalId,
      actor,
      ok: true,
      message: "Idempotent no-op — proposal already rolled_back.",
    });
    return {
      ok: true,
      proposalId,
      albumId: proposal.applied_album_id,
      rval: proposal.applied_rval ?? proposal.proposed_rval,
      deletedCat: 0,
      deletedAek: 0,
      deletedAlbum: 0,
      idempotent: true,
      rvtrsRestored: [],
    };
  }

  if (proposal.status !== "applied") {
    return {
      ok: false,
      code: "not_applied",
      message: `Proposal status is ${proposal.status}; rollback requires applied.`,
    };
  }

  const albumId = proposal.applied_album_id;
  const rval = proposal.applied_rval ?? proposal.proposed_rval;
  if (!albumId) {
    return {
      ok: false,
      code: "missing_applied_album_id",
      message: "applied_album_id missing — cannot rollback safely.",
    };
  }

  const plan = buildMbIngestRollbackPlan(proposal, albumId);

  try {
    const result = await withMbIngestTransaction(async (client) => {
      const catDeleted = await queryClient<{ id: number }>(
        client,
        `
        DELETE FROM canonical_album_tracks
        WHERE album_id = $1
          AND canonical_source = $2
        RETURNING id
        `,
        [albumId, MB_INGEST_CAT_SOURCE],
      );

      const aekDeleted = await queryClient<{ external_key: string }>(
        client,
        `
        DELETE FROM album_external_keys
        WHERE album_id = $1
          AND source = $2
        RETURNING external_key
        `,
        [albumId, MB_INGEST_AEK_SOURCE],
      );

      const remainingCat = await queryClient<{ c: number }>(
        client,
        `SELECT count(*)::int AS c FROM canonical_album_tracks WHERE album_id = $1`,
        [albumId],
      );
      let albumDeleted = 0;
      if ((remainingCat[0]?.c ?? 0) === 0) {
        const del = await queryClient<{ id: number }>(
          client,
          `DELETE FROM albums WHERE id = $1 RETURNING id`,
          [albumId],
        );
        albumDeleted = del.length;
      }

      await queryClient(
        client,
        `
        UPDATE mb_album_ingest_proposals
        SET status = 'rolled_back',
            rollback_at = now(),
            updated_at = now(),
            applied_album_id = NULL,
            applied_rval = NULL,
            applied_cat_row_ids = '[]'::jsonb
        WHERE proposal_id = $1
        `,
        [proposalId],
      );

      return {
        deletedCat: catDeleted.length,
        deletedAek: aekDeleted.length,
        deletedAlbum: albumDeleted,
      };
    });

    const rvtrsRestored = plan.rvtrsToRestore;
    const allUnlinked = (
      await Promise.all(rvtrsRestored.map((r) => rvtrUnlinked(r)))
    ).every(Boolean);

    await appendMbIngestAudit({
      action: "rollback",
      batchName: proposal.batch_name,
      rvtr: proposal.rvtr,
      proposalId,
      proposedRval: rval,
      actor,
      ok: true,
      message: `Rollback complete. CAT=${result.deletedCat} AEK=${result.deletedAek} albums=${result.deletedAlbum}. RVTRs unlinked=${allUnlinked}.`,
      signals: rvtrsRestored,
    });

    return {
      ok: true,
      proposalId,
      albumId,
      rval,
      deletedCat: result.deletedCat,
      deletedAek: result.deletedAek,
      deletedAlbum: result.deletedAlbum,
      idempotent: false,
      rvtrsRestored,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await appendMbIngestAudit({
      action: "rollback",
      batchName: proposal.batch_name,
      rvtr: proposal.rvtr,
      proposalId,
      actor,
      ok: false,
      message,
    });
    return { ok: false, code: "rollback_failed", message };
  }
}

/** Exported for tests — verify proposal has rollback metadata before apply. */
export function proposalReadyForRollbackTracking(
  proposal: MbIngestProposalApplyRow,
): boolean {
  return proposal.applied_album_id != null && proposal.applied_cat_row_ids.length > 0;
}
