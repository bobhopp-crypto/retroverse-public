import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectQuery } from "@/lib/inspect/pg";
import type { MbTracklistSlot, MbTrackRecovery } from "@/lib/healing/mb-ingest/types";

export const MB_INGEST_CAT_SOURCE = "musicbrainz_ingest_approved";
export const MB_INGEST_AEK_SOURCE = "musicbrainz_ingest";

export type MbIngestProposalApplyRow = {
  proposal_id: number;
  batch_name: string;
  rvtr: string;
  artist_id: number;
  artist_name: string;
  track_title: string;
  proposed_album_title: string;
  proposed_album_year: number | null;
  proposed_track_position: number;
  proposed_rval: string;
  proposed_tracklist_json: MbTracklistSlot[];
  track_recoveries_json: MbTrackRecovery[];
  status: string;
  applied_album_id: number | null;
  applied_rval: string | null;
  applied_cat_row_ids: number[];
};

export type PlannedRow = {
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  key: string;
  summary: string;
  fields?: Record<string, unknown>;
};

export type MbIngestApplyPlan = {
  proposalId: number;
  rvtr: string;
  recoveries: MbTrackRecovery[];
  inserts: PlannedRow[];
  updates: PlannedRow[];
  dependencyOrder: string[];
  rowCounts: { albums: number; album_external_keys: number; canonical_album_tracks: number };
};

export type MbIngestRollbackPlan = {
  proposalId: number;
  albumId: number | null;
  rval: string | null;
  rvtrsToRestore: string[];
  deletes: PlannedRow[];
  updates: PlannedRow[];
  dependencyOrder: string[];
  rowCounts: { canonical_album_tracks: number; album_external_keys: number; albums: number };
};

export async function ensureMbIngestApplySchema(): Promise<void> {
  const path = join(process.cwd(), "tools/sql/mb_album_ingest_apply_schema.sql");
  const sql = await readFile(path, "utf8");
  const { inspectExecute } = await import("@/lib/inspect/pg");
  await inspectExecute(sql);
}

export async function loadMbIngestProposal(
  proposalId: number,
): Promise<MbIngestProposalApplyRow | null> {
  const rows = await inspectQuery<{
    proposal_id: number;
    batch_name: string;
    rvtr: string;
    artist_id: number;
    artist_name: string;
    track_title: string;
    proposed_album_title: string;
    proposed_album_year: number | null;
    proposed_track_position: number;
    proposed_rval: string;
    proposed_tracklist_json: MbTracklistSlot[] | string;
    track_recoveries_json: MbTrackRecovery[] | string;
    status: string;
    applied_album_id: number | null;
    applied_rval: string | null;
    applied_cat_row_ids: number[] | string;
  }>(
    `
    SELECT proposal_id, batch_name, rvtr, artist_id, artist_name, track_title,
      proposed_album_title, proposed_album_year, proposed_track_position,
      proposed_rval, proposed_tracklist_json, track_recoveries_json, status,
      applied_album_id, applied_rval, applied_cat_row_ids
    FROM mb_album_ingest_proposals
    WHERE proposal_id = $1
    LIMIT 1
    `,
    [proposalId],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    proposed_tracklist_json: Array.isArray(row.proposed_tracklist_json)
      ? row.proposed_tracklist_json
      : (JSON.parse(String(row.proposed_tracklist_json ?? "[]")) as MbTracklistSlot[]),
    track_recoveries_json: Array.isArray(row.track_recoveries_json)
      ? row.track_recoveries_json
      : (JSON.parse(String(row.track_recoveries_json ?? "[]")) as MbTrackRecovery[]),
    applied_cat_row_ids: Array.isArray(row.applied_cat_row_ids)
      ? row.applied_cat_row_ids
      : (JSON.parse(String(row.applied_cat_row_ids ?? "[]")) as number[]),
  };
}

function recoveriesFor(proposal: MbIngestProposalApplyRow): MbTrackRecovery[] {
  if (proposal.track_recoveries_json.length > 0) return proposal.track_recoveries_json;
  return [
    {
      rvtr: proposal.rvtr.trim().toUpperCase(),
      track_title: proposal.track_title,
      position: proposal.proposed_track_position,
      mb_release_id: "",
      mb_recording_id: null,
      chart_weeks: 0,
      is_primary: true,
    },
  ];
}

export function buildMbIngestApplyPlan(proposal: MbIngestProposalApplyRow): MbIngestApplyPlan {
  const recoveries = recoveriesFor(proposal);
  const tracklist = proposal.proposed_tracklist_json;
  const linkedSlots = recoveries.map((r) => ({
    rvtr: r.rvtr.trim().toUpperCase(),
    position: r.position,
    title: r.track_title,
  }));

  const inserts: PlannedRow[] = [
    {
      table: "albums",
      operation: "INSERT",
      key: `artist_id=${proposal.artist_id}`,
      summary: `New album "${proposal.proposed_album_title}" (${proposal.proposed_album_year ?? "—"})`,
      fields: {
        artist_id: proposal.artist_id,
        title: proposal.proposed_album_title,
        release_year: proposal.proposed_album_year,
      },
    },
    {
      table: "album_external_keys",
      operation: "INSERT",
      key: proposal.proposed_rval,
      summary: `Bridge ${proposal.proposed_rval} → new album_id`,
      fields: {
        external_key: proposal.proposed_rval,
        source: MB_INGEST_AEK_SOURCE,
        confidence_score: proposal.proposed_album_year,
      },
    },
    ...tracklist.map((slot, idx) => {
      const pos = slot.position ?? idx + 1;
      const link = linkedSlots.find((s) => s.position === pos);
      return {
        table: "canonical_album_tracks",
        operation: "INSERT" as const,
        key: `position=${pos}`,
        summary: link
          ? `Slot ${pos}: "${slot.title}" → RVTR ${link.rvtr}`
          : `Slot ${pos}: "${slot.title}" (unlinked)`,
        fields: {
          position: pos,
          title: slot.title,
          canonical_track_key: link?.rvtr ?? null,
          canonical_source: MB_INGEST_CAT_SOURCE,
          review_flag: "curated",
        },
      };
    }),
  ];

  const updates: PlannedRow[] = [
    {
      table: "mb_album_ingest_proposals",
      operation: "UPDATE",
      key: `proposal_id=${proposal.proposal_id}`,
      summary: "status=applied, store applied_album_id, applied_rval, applied_cat_row_ids",
      fields: {
        status: "applied",
        applied_at: "<now>",
      },
    },
  ];

  return {
    proposalId: proposal.proposal_id,
    rvtr: proposal.rvtr.trim().toUpperCase(),
    recoveries,
    inserts,
    updates,
    dependencyOrder: [
      "1. INSERT albums (allocates album_id)",
      "2. INSERT album_external_keys (binds proposed RVAL)",
      "3. INSERT canonical_album_tracks (all tracklist slots)",
      "4. Linked slots written with canonical_track_key = RVTR on INSERT",
      "5. UPDATE mb_album_ingest_proposals → applied + applied_* ids",
      "6. AUDIT append mb_ingest_apply",
    ],
    rowCounts: {
      albums: 1,
      album_external_keys: 1,
      canonical_album_tracks: tracklist.length,
    },
  };
}

export function buildMbIngestRollbackPlan(
  proposal: MbIngestProposalApplyRow,
  albumId: number,
): MbIngestRollbackPlan {
  const recoveries = recoveriesFor(proposal);
  const rval = proposal.applied_rval ?? proposal.proposed_rval;
  const catCount = proposal.applied_cat_row_ids.length || proposal.proposed_tracklist_json.length;

  const deletes: PlannedRow[] = [
    {
      table: "canonical_album_tracks",
      operation: "DELETE",
      key: `album_id=${albumId}`,
      summary: `DELETE WHERE album_id=$id AND canonical_source='${MB_INGEST_CAT_SOURCE}'`,
      fields: { album_id: albumId, canonical_source: MB_INGEST_CAT_SOURCE },
    },
    {
      table: "album_external_keys",
      operation: "DELETE",
      key: rval,
      summary: `DELETE WHERE album_id=$id AND source='${MB_INGEST_AEK_SOURCE}'`,
      fields: { external_key: rval, source: MB_INGEST_AEK_SOURCE },
    },
    {
      table: "albums",
      operation: "DELETE",
      key: `album_id=${albumId}`,
      summary: "DELETE only if zero non-ingest CAT rows remain on album_id",
      fields: { id: albumId },
    },
  ];

  const updates: PlannedRow[] = [
    {
      table: "mb_album_ingest_proposals",
      operation: "UPDATE",
      key: `proposal_id=${proposal.proposal_id}`,
      summary: "status=rolled_back, rollback_at=now, clear applied_* (optional retain audit)",
      fields: {
        status: "rolled_back",
        rollback_at: "<now>",
        applied_album_id: null,
        applied_rval: null,
        applied_cat_row_ids: [],
      },
    },
  ];

  return {
    proposalId: proposal.proposal_id,
    albumId,
    rval,
    rvtrsToRestore: recoveries.map((r) => r.rvtr.trim().toUpperCase()),
    deletes,
    updates,
    dependencyOrder: [
      "1. DELETE canonical_album_tracks (musicbrainz_ingest_approved only)",
      "2. DELETE album_external_keys (musicbrainz_ingest source only)",
      "3. DELETE albums (if no remaining CAT rows)",
      "4. UPDATE mb_album_ingest_proposals → rolled_back",
      "5. AUDIT append mb_ingest_rollback",
      "6. RVTR state restored: linked keys removed → tracks unlinked again",
    ],
    rowCounts: {
      canonical_album_tracks: catCount,
      album_external_keys: 1,
      albums: 1,
    },
  };
}

export type MbIngestDryRunResult = {
  proposal: MbIngestProposalApplyRow;
  applyPlan: MbIngestApplyPlan;
  rollbackPlan: MbIngestRollbackPlan;
  preState: {
    rvtrLinked: boolean;
    albumExists: boolean;
    rvalExists: boolean;
    proposalStatus: string;
  };
  failureModes: Array<{ code: string; scenario: string; mitigation: string }>;
  fullyReversible: boolean;
  reversibleReason: string;
};

export async function simulateMbIngestDryRun(
  proposalId: number,
): Promise<MbIngestDryRunResult | null> {
  const proposal = await loadMbIngestProposal(proposalId);
  if (!proposal) return null;

  const rvtr = proposal.rvtr.trim().toUpperCase();
  const [linked, album, rval] = await Promise.all([
    inspectQuery<{ rvtr: string }>(
      `SELECT upper(trim(canonical_track_key)) AS rvtr FROM canonical_album_tracks WHERE upper(trim(canonical_track_key))=$1 LIMIT 1`,
      [rvtr],
    ),
    inspectQuery<{ id: number }>(
      `
      SELECT al.id FROM albums al
      WHERE al.artist_id=$1
        AND lower(regexp_replace(trim(al.title), '[^a-z0-9]+', ' ', 'g'))
          = lower(regexp_replace($2::text, '[^a-z0-9]+', ' ', 'g'))
      LIMIT 1
      `,
      [proposal.artist_id, proposal.proposed_album_title],
    ),
    inspectQuery<{ rval: string }>(
      `SELECT upper(trim(external_key)) AS rval FROM album_external_keys WHERE upper(trim(external_key))=$1 LIMIT 1`,
      [proposal.proposed_rval],
    ),
  ]);

  const applyPlan = buildMbIngestApplyPlan(proposal);
  const simulatedAlbumId = -proposal.proposal_id;
  const rollbackPlan = buildMbIngestRollbackPlan(proposal, simulatedAlbumId);

  const failureModes = [
    {
      code: "partial_apply",
      scenario: "Transaction aborts after albums insert but before CAT bulk insert",
      mitigation: "Single TX wraps all apply steps; nothing commits on failure",
    },
    {
      code: "wrong_source_delete",
      scenario: "Rollback DELETE without canonical_source guard",
      mitigation: `DELETE scoped to canonical_source='${MB_INGEST_CAT_SOURCE}' only`,
    },
    {
      code: "double_rollback",
      scenario: "rollbackMbIngest called twice on same proposal",
      mitigation: "Idempotent: status rolled_back → no-op with ok=true",
    },
    {
      code: "missing_applied_ids",
      scenario: "Proposal applied but applied_album_id not stored",
      mitigation: "Block apply unless applied_* persisted on proposal row in same TX",
    },
    {
      code: "orphan_album",
      scenario: "CAT deleted but albums row remains",
      mitigation: "DELETE albums only after CAT purge; guard checks zero remaining CAT",
    },
    {
      code: "rvtr_still_linked",
      scenario: "Rollback misses linked RVTR slot",
      mitigation: `DELETE all CAT rows for album_id with ingest source; restores ${rollbackPlan.rvtrsToRestore.join(", ")}`,
    },
    {
      code: "concurrent_apply",
      scenario: "Two applies race on same RVAL",
      mitigation: "Pre-apply RVAL collision check + unique external_key constraint",
    },
  ];

  const blockers: string[] = [];
  if (linked.length > 0) blockers.push("RVTR already linked");
  if (album.length > 0) blockers.push("album already exists");
  if (rval.length > 0) blockers.push("RVAL already in canonical");

  const fullyReversible =
    blockers.length === 0 &&
    applyPlan.rowCounts.canonical_album_tracks > 0 &&
    rollbackPlan.rvtrsToRestore.length > 0;

  const reversibleReason = fullyReversible
    ? `Apply creates ${applyPlan.rowCounts.albums} album + ${applyPlan.rowCounts.album_external_keys} RVAL + ${applyPlan.rowCounts.canonical_album_tracks} CAT rows (tagged ${MB_INGEST_CAT_SOURCE}). Rollback deletes exactly those tagged rows and clears RVTR keys → zero orphans if TX completes.`
    : `Pre-apply blockers: ${blockers.join("; ") || "plan incomplete"}`;

  return {
    proposal,
    applyPlan,
    rollbackPlan,
    preState: {
      rvtrLinked: linked.length > 0,
      albumExists: album.length > 0,
      rvalExists: rval.length > 0,
      proposalStatus: proposal.status,
    },
    failureModes,
    fullyReversible,
    reversibleReason,
  };
}
