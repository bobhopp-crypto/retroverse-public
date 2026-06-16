import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { appendMbIngestAudit } from "@/lib/healing/mb-ingest/audit";
import { groupCandidates, type RejectedCandidate } from "@/lib/healing/mb-ingest/harden";
import {
  allocateProposedRvals,
  proposedRvalCollides,
} from "@/lib/healing/mb-ingest/propose-rval";
import { checkMbIngestSafety, isCanaryStudioAlbum } from "@/lib/healing/mb-ingest/safety";
import {
  MB_CANARY_BATCH,
  MB_WAVE_25_BATCH,
  type MbCanaryStageResult,
  type MbCurationVerdict,
  type MbTrackRecovery,
  type PilotMbRow,
} from "@/lib/healing/mb-ingest/types";
import { inspectExecute, inspectPing, inspectQuery } from "@/lib/inspect/pg";

const SCHEMA_PATH = join(process.cwd(), "tools/sql/mb_album_ingest_proposals_schema.sql");
const HARDENING_PATH = join(
  process.cwd(),
  "tools/sql/mb_album_ingest_proposals_hardening.sql",
);

export async function ensureMbIngestSchema(): Promise<void> {
  const base = await readFile(SCHEMA_PATH, "utf8");
  await inspectExecute(base);
  try {
    const hardening = await readFile(HARDENING_PATH, "utf8");
    await inspectExecute(hardening);
  } catch {
    // migration file optional on first run
  }
}

export async function clearCanaryBatch(batchName = MB_CANARY_BATCH): Promise<number> {
  return inspectExecute(
    `DELETE FROM mb_album_ingest_proposals WHERE batch_name = $1`,
    [batchName],
  );
}

export function selectCanaryCandidates(rows: PilotMbRow[]): PilotMbRow[] {
  return rows
    .filter((r) => r.autoIngestable && r.confidence === "high")
    .filter((r) => isCanaryStudioAlbum(r.mb.album ?? "", r.artist_name).ok)
    .sort((a, b) => b.chart_weeks - a.chart_weeks);
}

export async function loadPilotRows(): Promise<PilotMbRow[]> {
  const raw = await readFile(
    join(process.cwd(), "tools/out/musicbrainz-ingest-pilot.json"),
    "utf8",
  );
  const data = JSON.parse(raw) as { rows: PilotMbRow[] };
  return data.rows;
}

async function insertHardenedProposal(input: {
  group: {
    albumGroupKey: string;
    artistId: number;
    artistName: string;
    albumTitle: string;
    albumYear: number | null;
    releaseShape: string;
    proposedRval: string;
    primary: PilotMbRow;
    recoveries: MbTrackRecovery[];
    qualifyReason: string;
    signals: string[];
    curationVerdict: MbCurationVerdict;
    rejectReason: string | null;
  };
  status: "staged" | "rejected";
}): Promise<number> {
  const { group, status } = input;
  const primary = group.primary;
  const inserted = await inspectQuery<{ proposal_id: number }>(
    `
    INSERT INTO mb_album_ingest_proposals (
      batch_name, rvtr, artist_id, artist_name, track_title,
      mb_release_group_id, mb_release_id, mb_recording_id,
      proposed_rval, proposed_album_title, proposed_album_year,
      proposed_track_position, proposed_tracklist_json,
      confidence, signals_json, qualify_reason, status,
      album_group_key, is_album_primary, track_recoveries_json,
      curation_verdict, reject_reason, release_shape
    )
    VALUES (
      $1, $2, $3, $4, $5,
      NULL, $6, $7,
      $8, $9, $10,
      $11, $12::jsonb,
      $13, $14::jsonb, $15, $16,
      $17, true, $18::jsonb,
      $19, $20, $21
    )
    ON CONFLICT (rvtr, batch_name) DO UPDATE SET
      proposed_rval = EXCLUDED.proposed_rval,
      proposed_album_title = EXCLUDED.proposed_album_title,
      proposed_album_year = EXCLUDED.proposed_album_year,
      proposed_track_position = EXCLUDED.proposed_track_position,
      proposed_tracklist_json = EXCLUDED.proposed_tracklist_json,
      track_recoveries_json = EXCLUDED.track_recoveries_json,
      album_group_key = EXCLUDED.album_group_key,
      curation_verdict = EXCLUDED.curation_verdict,
      reject_reason = EXCLUDED.reject_reason,
      release_shape = EXCLUDED.release_shape,
      status = EXCLUDED.status,
      updated_at = now()
    RETURNING proposal_id
    `,
    [
      MB_CANARY_BATCH,
      primary.rvtr.trim().toUpperCase(),
      group.artistId,
      group.artistName.trim(),
      primary.title.trim(),
      primary.mb.mbReleaseId,
      primary.mb.mbRecordingId,
      group.proposedRval,
      group.albumTitle,
      group.albumYear,
      primary.mb.trackPosition,
      JSON.stringify(primary.mb.tracklist),
      primary.confidence,
      JSON.stringify(group.signals),
      group.qualifyReason,
      status,
      group.albumGroupKey,
      JSON.stringify(group.recoveries),
      group.curationVerdict,
      group.rejectReason,
      group.releaseShape,
    ],
  );
  return Number(inserted[0]!.proposal_id);
}

async function insertRejectedRow(rejected: RejectedCandidate): Promise<number> {
  const row = rejected.row;
  const rvalPlaceholder = "RVAL000000";
  const inserted = await inspectQuery<{ proposal_id: number }>(
    `
    INSERT INTO mb_album_ingest_proposals (
      batch_name, rvtr, artist_id, artist_name, track_title,
      mb_release_group_id, mb_release_id, mb_recording_id,
      proposed_rval, proposed_album_title, proposed_album_year,
      proposed_track_position, proposed_tracklist_json,
      confidence, signals_json, qualify_reason, status,
      album_group_key, is_album_primary, track_recoveries_json,
      curation_verdict, reject_reason, release_shape
    )
    VALUES (
      $1, $2, $3, $4, $5,
      NULL, $6, $7,
      $8, $9, $10,
      $11, $12::jsonb,
      $13, $14::jsonb, $15, 'rejected',
      $16, true, '[]'::jsonb,
      'reject', $17, $18
    )
    ON CONFLICT (rvtr, batch_name) DO UPDATE SET
      status = 'rejected',
      curation_verdict = 'reject',
      reject_reason = EXCLUDED.reject_reason,
      release_shape = EXCLUDED.release_shape,
      updated_at = now()
    RETURNING proposal_id
    `,
    [
      MB_CANARY_BATCH,
      row.rvtr.trim().toUpperCase(),
      row.artist_id,
      row.artist_name.trim(),
      row.title.trim(),
      row.mb.mbReleaseId,
      row.mb.mbRecordingId,
      rvalPlaceholder,
      row.mb.album!.trim(),
      row.mb.releaseYear,
      row.mb.trackPosition ?? 0,
      JSON.stringify(row.mb.tracklist),
      row.confidence,
      JSON.stringify(row.signals),
      `Rejected: ${rejected.reason}`,
      row.artist_id ? `${row.artist_id}:${row.mb.album}` : null,
      rejected.reason,
      rejected.releaseShape,
    ],
  );
  return Number(inserted[0]!.proposal_id);
}

export async function stageMbCanary25Hardened(
  actor = "mb-canary-stage-hardened",
): Promise<MbCanaryStageResult> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error(`Postgres unavailable: ${ping.error}`);

  await ensureMbIngestSchema();
  await clearCanaryBatch();

  const pilotRows = await loadPilotRows();
  const candidates = selectCanaryCandidates(pilotRows);

  const skipReasons: Record<string, number> = {};
  const qualified: Array<{
    row: PilotMbRow;
    qualifyReason: string;
    signals: string[];
  }> = [];

  for (const row of candidates) {
    const safety = await checkMbIngestSafety(row);
    if (!safety.ok) {
      skipReasons[safety.reason] = (skipReasons[safety.reason] ?? 0) + 1;
      continue;
    }
    qualified.push({
      row,
      qualifyReason: safety.qualifyReason,
      signals: safety.signals,
    });
  }

  const { groups, rejected } = groupCandidates(qualified);
  const proposedRvals = await allocateProposedRvals(groups.length);

  const proposalIds: number[] = [];
  let approve = 0;
  let review = 0;
  let reject = 0;

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]!;
    const proposedRval = proposedRvals[i]!;
    if (await proposedRvalCollides(proposedRval)) {
      skipReasons.proposed_rval_collision = (skipReasons.proposed_rval_collision ?? 0) + 1;
      continue;
    }

    const proposalId = await insertHardenedProposal({
      group: { ...group, proposedRval },
      status: "staged",
    });
    proposalIds.push(proposalId);

    if (group.curationVerdict === "approve") approve += 1;
    else if (group.curationVerdict === "review") review += 1;
    else reject += 1;

    await appendMbIngestAudit({
      action: "stage",
      batchName: MB_CANARY_BATCH,
      rvtr: group.primary.rvtr,
      proposalId,
      proposedRval,
      mbReleaseId: group.primary.mb.mbReleaseId!,
      actor,
      ok: true,
      message: `Hardened album group (${group.recoveries.length} RVTRs, ${group.curationVerdict}).`,
      signals: group.signals,
    });
  }

  for (const rej of rejected) {
    const proposalId = await insertRejectedRow(rej);
    proposalIds.push(proposalId);
    reject += 1;
    skipReasons[rej.reason] = (skipReasons[rej.reason] ?? 0) + 1;
    await appendMbIngestAudit({
      action: "stage",
      batchName: MB_CANARY_BATCH,
      rvtr: rej.row.rvtr,
      proposalId,
      actor,
      ok: false,
      message: `Rejected at hardening: ${rej.reason}`,
    });
  }

  const skipped = Object.values(skipReasons).reduce((sum, n) => sum + n, 0);

  return {
    batchName: MB_CANARY_BATCH,
    staged: groups.length,
    skipped,
    skipReasons,
    proposalIds,
    approve,
    review,
    reject,
    albumGroups: groups.length,
  };
}

/** @deprecated Use stageMbCanary25Hardened */
export async function stageMbCanary25(actor = "mb-canary-stage"): Promise<MbCanaryStageResult> {
  return stageMbCanary25Hardened(actor);
}

export async function loadStagedProposals(
  batchName = MB_CANARY_BATCH,
): Promise<
  Array<{
    proposal_id: number;
    rvtr: string;
    artist_name: string;
    track_title: string;
    proposed_album_title: string;
    proposed_album_year: number | null;
    proposed_track_position: number;
    mb_release_id: string;
    mb_release_group_id: string | null;
    mb_recording_id: string | null;
    proposed_rval: string;
    confidence: string;
    signals_json: string[];
    qualify_reason: string | null;
    status: string;
    album_group_key: string | null;
    track_recoveries_json: MbTrackRecovery[];
    curation_verdict: MbCurationVerdict | null;
    reject_reason: string | null;
    release_shape: string | null;
    chart_weeks?: number;
  }>
> {
  const rows = await inspectQuery<{
    proposal_id: number;
    rvtr: string;
    artist_name: string;
    track_title: string;
    proposed_album_title: string;
    proposed_album_year: number | null;
    proposed_track_position: number;
    mb_release_id: string;
    mb_release_group_id: string | null;
    mb_recording_id: string | null;
    proposed_rval: string;
    confidence: string;
    signals_json: string[] | string;
    qualify_reason: string | null;
    status: string;
    album_group_key: string | null;
    track_recoveries_json: MbTrackRecovery[] | string;
    curation_verdict: MbCurationVerdict | null;
    reject_reason: string | null;
    release_shape: string | null;
  }>(
    `
    SELECT proposal_id, rvtr, artist_name, track_title,
      proposed_album_title, proposed_album_year, proposed_track_position,
      mb_release_id, mb_release_group_id, mb_recording_id,
      proposed_rval, confidence, signals_json, qualify_reason, status,
      album_group_key, track_recoveries_json, curation_verdict, reject_reason, release_shape
    FROM mb_album_ingest_proposals
    WHERE batch_name = $1
    ORDER BY proposal_id ASC
    `,
    [batchName],
  );

  let pilotMap = new Map<string, number>();
  try {
    const pilot = await loadPilotRows();
    pilotMap = new Map(pilot.map((r) => [r.rvtr.toUpperCase(), r.chart_weeks]));
  } catch {
    // optional
  }

  return rows.map((r) => ({
    ...r,
    signals_json: Array.isArray(r.signals_json)
      ? r.signals_json
      : (JSON.parse(String(r.signals_json ?? "[]")) as string[]),
    track_recoveries_json: Array.isArray(r.track_recoveries_json)
      ? r.track_recoveries_json
      : (JSON.parse(String(r.track_recoveries_json ?? "[]")) as MbTrackRecovery[]),
    chart_weeks: pilotMap.get(r.rvtr.toUpperCase()),
  }));
}

/** Incremental wave staging — does not clear prior batches; skips RVTRs already in proposals. */
export async function stageMbWave25Incremental(
  actor = "mb-wave-25-stage",
): Promise<MbCanaryStageResult> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error(`Postgres unavailable: ${ping.error}`);

  await ensureMbIngestSchema();

  const existingRvtrs = new Set(
    (
      await inspectQuery<{ rvtr: string }>(
        `SELECT upper(trim(rvtr)) AS rvtr FROM mb_album_ingest_proposals`,
      )
    ).map((r) => r.rvtr),
  );

  const pilotRows = (await loadPilotRows()).filter(
    (r) => r.autoIngestable && !existingRvtrs.has(r.rvtr.toUpperCase()),
  );

  const skipReasons: Record<string, number> = {};
  const qualified: Array<{
    row: PilotMbRow;
    qualifyReason: string;
    signals: string[];
  }> = [];

  for (const row of pilotRows) {
    const safety = await checkMbIngestSafety(row);
    if (!safety.ok) {
      skipReasons[safety.reason] = (skipReasons[safety.reason] ?? 0) + 1;
      continue;
    }
    qualified.push({
      row,
      qualifyReason: safety.qualifyReason,
      signals: safety.signals,
    });
  }

  const { groups, rejected } = groupCandidates(qualified);
  const proposedRvals = await allocateProposedRvals(groups.length);

  const proposalIds: number[] = [];
  let approve = 0;
  let review = 0;
  let reject = 0;

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]!;
    const proposedRval = proposedRvals[i]!;
    if (await proposedRvalCollides(proposedRval)) {
      skipReasons.proposed_rval_collision = (skipReasons.proposed_rval_collision ?? 0) + 1;
      continue;
    }

    const proposalId = await insertHardenedProposal({
      batchName: MB_WAVE_25_BATCH,
      group: { ...group, proposedRval },
      status: "staged",
    });
    proposalIds.push(proposalId);

    if (group.curationVerdict === "approve") approve += 1;
    else if (group.curationVerdict === "review") review += 1;
    else reject += 1;

    await appendMbIngestAudit({
      action: "stage",
      batchName: MB_WAVE_25_BATCH,
      rvtr: group.primary.rvtr,
      proposalId,
      proposedRval,
      mbReleaseId: group.primary.mb.mbReleaseId!,
      actor,
      ok: true,
      message: `Incremental stage (${group.recoveries.length} RVTRs, ${group.curationVerdict}).`,
      signals: group.signals,
    });
  }

  for (const rej of rejected) {
    reject += 1;
    skipReasons[rej.reason] = (skipReasons[rej.reason] ?? 0) + 1;
  }

  const skipped = Object.values(skipReasons).reduce((sum, n) => sum + n, 0);

  return {
    batchName: MB_WAVE_25_BATCH,
    staged: groups.length,
    skipped,
    skipReasons,
    proposalIds,
    approve,
    review,
    reject,
    albumGroups: groups.length,
  };
}
