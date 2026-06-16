import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { slugFromArtistName } from "@/lib/artist/slug";
import { appendMbIngestAudit } from "@/lib/healing/mb-ingest/audit";
import { runApplyReadinessReview } from "@/lib/healing/mb-ingest/apply-readiness";
import { applyMbIngest } from "@/lib/healing/mb-ingest/apply-mb-ingest";
import {
  ensureMbIngestApplySchema,
  loadMbIngestProposal,
  MB_INGEST_AEK_SOURCE,
  MB_INGEST_CAT_SOURCE,
} from "@/lib/healing/mb-ingest/apply-plan";
import { mbIngestApplyEnabled } from "@/lib/healing/mb-ingest/apply-guard";
import { stageMbWave25Incremental } from "@/lib/healing/mb-ingest/stage";
import { WAVE_25_TARGET } from "@/lib/healing/mb-ingest/types";
import {
  loadGraphMetrics,
  verifyPreApply,
  WAVE_10_CUMULATIVE_IDS,
  type GraphMetrics,
  type PreApplyCheck,
} from "@/lib/healing/mb-ingest/wave-10-apply";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { inspectQuery } from "@/lib/inspect/pg";

const ACTOR = "mb-wave-25-apply";

export type Wave25ApplyRow = {
  proposalId: number;
  rvtr: string;
  artistName: string;
  trackTitle: string;
  albumTitle: string;
  rval: string | null;
  albumId: number | null;
  rvtrsRecovered: string[];
  applied: boolean;
  verificationPass: boolean;
  albumPageLoads: boolean;
  artistAlbumListed: boolean;
  error: string | null;
};

export type Wave25ApplyResult = {
  wave: string;
  targetCount: number;
  proposalIds: number[];
  priorCumulativeIds: number[];
  baseline: GraphMetrics;
  after: GraphMetrics;
  preApply: PreApplyCheck[];
  rows: Wave25ApplyRow[];
  stoppedEarly: boolean;
  stopReason: string | null;
  allPassed: boolean;
  stagedIncremental: { approve: number; staged: number } | null;
  impact: {
    albumsAdded: number;
    rvtrLinksAdded: number;
    hot100Gain: number;
    albumPageGain: number;
    artistRelationshipGain: number;
  };
  nextQueue: Array<{
    proposalId: number;
    rvtr: string;
    artistName: string;
    albumTitle: string;
    proposedRval: string;
    chartWeeks: number;
    verdict: string;
  }>;
};

async function loadAppliedProposalIds(): Promise<Set<number>> {
  const rows = await inspectQuery<{ proposal_id: number }>(
    `SELECT proposal_id FROM mb_album_ingest_proposals WHERE status = 'applied'`,
  );
  return new Set(rows.map((r) => Number(r.proposal_id)));
}

export async function resolveNextReadyProposalIds(
  limit: number,
): Promise<number[]> {
  return resolveWave25ProposalIds(limit);
}

export async function resolveWave25ProposalIds(
  limit = WAVE_25_TARGET,
): Promise<number[]> {
  const applied = await loadAppliedProposalIds();
  const readiness = await runApplyReadinessReview();
  return readiness.ready
    .filter((r) => !applied.has(r.proposalId))
    .sort((a, b) => b.chartWeeks - a.chartWeeks)
    .slice(0, limit)
    .map((r) => r.proposalId);
}

async function verifyPostApply(
  proposalId: number,
  albumId: number,
  rval: string,
  rvtrs: string[],
  expectedCatRows: number,
  artistName: string,
  albumTitle: string,
): Promise<{
  pass: boolean;
  error: string | null;
  albumPageLoads: boolean;
  artistAlbumListed: boolean;
}> {
  const [album, aek, catCount, ...rvtrChecks] = await Promise.all([
    inspectQuery<{ id: number }>(`SELECT id FROM albums WHERE id=$1 LIMIT 1`, [albumId]),
    inspectQuery<{ external_key: string }>(
      `SELECT external_key FROM album_external_keys WHERE upper(trim(external_key))=$1 AND source=$2 LIMIT 1`,
      [rval, MB_INGEST_AEK_SOURCE],
    ),
    inspectQuery<{ c: number }>(
      `SELECT count(*)::int AS c FROM canonical_album_tracks WHERE album_id=$1 AND canonical_source=$2`,
      [albumId, MB_INGEST_CAT_SOURCE],
    ),
    ...rvtrs.map((rvtr) =>
      inspectQuery<{ rvtr: string }>(
        `SELECT upper(trim(canonical_track_key)) AS rvtr FROM canonical_album_tracks WHERE upper(trim(canonical_track_key))=$1 LIMIT 1`,
        [rvtr],
      ),
    ),
  ]);

  const trackPage = await loadTrackPage(rvtrs[0]!);
  const albumPage = await loadAlbumPage(rval);
  const artistPage = await loadArtistPage(slugFromArtistName(artistName));
  const artistAlbumListed = Boolean(
    artistPage?.essentialAlbums?.some(
      (a) =>
        a.rval?.toUpperCase() === rval.toUpperCase() ||
        a.title.trim().toLowerCase() === albumTitle.trim().toLowerCase(),
    ),
  );

  const catRows = catCount[0]?.c ?? 0;
  if (!album[0]) return { pass: false, error: "album missing", albumPageLoads: false, artistAlbumListed };
  if (!aek[0]) return { pass: false, error: "RVAL missing", albumPageLoads: false, artistAlbumListed };
  if (catRows !== expectedCatRows) {
    return { pass: false, error: `CAT ${catRows}/${expectedCatRows}`, albumPageLoads: Boolean(albumPage), artistAlbumListed };
  }
  for (let i = 0; i < rvtrs.length; i += 1) {
    if (!rvtrChecks[i]?.[0]) {
      return { pass: false, error: `${rvtrs[i]} not linked`, albumPageLoads: Boolean(albumPage), artistAlbumListed };
    }
  }
  if ((trackPage?.albums.length ?? 0) < 1) {
    return { pass: false, error: "track page no album", albumPageLoads: Boolean(albumPage), artistAlbumListed };
  }

  const proposal = await loadMbIngestProposal(proposalId);
  if (proposal?.status !== "applied") {
    return { pass: false, error: `status ${proposal?.status}`, albumPageLoads: Boolean(albumPage), artistAlbumListed };
  }

  return { pass: true, error: null, albumPageLoads: Boolean(albumPage), artistAlbumListed };
}

export async function ensureWave25Queue(minReady = WAVE_25_TARGET): Promise<{
  ids: number[];
  staged: { approve: number; staged: number } | null;
}> {
  let ids = await resolveWave25ProposalIds(minReady);
  let staged: { approve: number; staged: number } | null = null;

  if (ids.length < minReady) {
    const stageResult = await stageMbWave25Incremental();
    staged = { approve: stageResult.approve, staged: stageResult.staged };
    ids = await resolveWave25ProposalIds(minReady);
  }

  return { ids, staged };
}

export async function runWave25Apply(): Promise<Wave25ApplyResult> {
  const baseline = await loadGraphMetrics();
  const preApply: PreApplyCheck[] = [];
  const rows: Wave25ApplyRow[] = [];
  let stoppedEarly = false;
  let stopReason: string | null = null;
  let stagedIncremental: { approve: number; staged: number } | null = null;

  const emptyNext = async () => {
    const readiness = await runApplyReadinessReview();
    const applied = await loadAppliedProposalIds();
    return readiness.ready
      .filter((r) => !applied.has(r.proposalId))
      .sort((a, b) => b.chartWeeks - a.chartWeeks)
      .slice(0, 25)
      .map((r) => ({
        proposalId: r.proposalId,
        rvtr: r.rvtr,
        artistName: r.artistName,
        albumTitle: r.albumTitle,
        proposedRval: r.proposedRval,
        chartWeeks: r.chartWeeks,
        verdict: r.verdict,
      }));
  };

  if (!mbIngestApplyEnabled()) {
    return {
      wave: "APPLY-25",
      targetCount: WAVE_25_TARGET,
      proposalIds: [],
      priorCumulativeIds: [...WAVE_10_CUMULATIVE_IDS],
      baseline,
      after: baseline,
      preApply,
      rows,
      stoppedEarly: true,
      stopReason: "RETROVERSE_MB_INGEST_APPLY=1 not set",
      allPassed: false,
      stagedIncremental: null,
      impact: {
        albumsAdded: 0,
        rvtrLinksAdded: 0,
        hot100Gain: 0,
        albumPageGain: 0,
        artistRelationshipGain: 0,
      },
      nextQueue: await emptyNext(),
    };
  }

  await ensureMbIngestApplySchema();

  const queue = await ensureWave25Queue(WAVE_25_TARGET);
  stagedIncremental = queue.staged;
  const proposalIds = queue.ids.slice(0, WAVE_25_TARGET);

  if (proposalIds.length === 0) {
    return {
      wave: "APPLY-25",
      targetCount: WAVE_25_TARGET,
      proposalIds: [],
      priorCumulativeIds: [...WAVE_10_CUMULATIVE_IDS],
      baseline,
      after: baseline,
      preApply,
      rows,
      stoppedEarly: true,
      stopReason: "no approve-ready proposals available",
      allPassed: false,
      stagedIncremental,
      impact: {
        albumsAdded: 0,
        rvtrLinksAdded: 0,
        hot100Gain: 0,
        albumPageGain: 0,
        artistRelationshipGain: 0,
      },
      nextQueue: await emptyNext(),
    };
  }

  for (const proposalId of proposalIds) {
    const pre = await verifyPreApply(proposalId);
    preApply.push(pre);
    if (!pre.pass) {
      stoppedEarly = true;
      stopReason = `pre-apply failed ${proposalId}: ${pre.errors.join("; ")}`;
      break;
    }

    const proposal = await loadMbIngestProposal(proposalId);
    if (!proposal) {
      stoppedEarly = true;
      stopReason = `proposal ${proposalId} not found`;
      break;
    }

    if (proposal.status === "applied") {
      const rvtrs =
        proposal.track_recoveries_json.length > 0
          ? proposal.track_recoveries_json.map((r) => r.rvtr.trim().toUpperCase())
          : [proposal.rvtr.trim().toUpperCase()];
      rows.push({
        proposalId,
        rvtr: proposal.rvtr,
        artistName: proposal.artist_name,
        trackTitle: proposal.track_title,
        albumTitle: proposal.proposed_album_title,
        rval: proposal.applied_rval,
        albumId: proposal.applied_album_id,
        rvtrsRecovered: rvtrs,
        applied: true,
        verificationPass: true,
        albumPageLoads: true,
        artistAlbumListed: true,
        error: null,
      });
      continue;
    }

    const rvtrs =
      proposal.track_recoveries_json.length > 0
        ? proposal.track_recoveries_json.map((r) => r.rvtr.trim().toUpperCase())
        : [proposal.rvtr.trim().toUpperCase()];
    const expectedCatRows = proposal.proposed_tracklist_json.length;

    await appendMbIngestAudit({
      action: "apply",
      batchName: proposal.batch_name,
      rvtr: proposal.rvtr,
      proposalId,
      proposedRval: proposal.proposed_rval,
      actor: ACTOR,
      ok: true,
      message: `Wave-25 apply start ${proposalId}`,
    });

    const applyResult = await applyMbIngest(proposalId, ACTOR);
    if (!applyResult.ok) {
      rows.push({
        proposalId,
        rvtr: proposal.rvtr,
        artistName: proposal.artist_name,
        trackTitle: proposal.track_title,
        albumTitle: proposal.proposed_album_title,
        rval: proposal.proposed_rval,
        albumId: null,
        rvtrsRecovered: rvtrs,
        applied: false,
        verificationPass: false,
        albumPageLoads: false,
        artistAlbumListed: false,
        error: applyResult.message,
      });
      stoppedEarly = true;
      stopReason = `apply failed ${proposalId}: ${applyResult.message}`;
      break;
    }

    const verify = await verifyPostApply(
      proposalId,
      applyResult.albumId,
      applyResult.rval,
      applyResult.linkedRvtrs,
      expectedCatRows,
      proposal.artist_name,
      proposal.proposed_album_title,
    );

    rows.push({
      proposalId,
      rvtr: proposal.rvtr,
      artistName: proposal.artist_name,
      trackTitle: proposal.track_title,
      albumTitle: proposal.proposed_album_title,
      rval: applyResult.rval,
      albumId: applyResult.albumId,
      rvtrsRecovered: applyResult.linkedRvtrs,
      applied: true,
      verificationPass: verify.pass,
      albumPageLoads: verify.albumPageLoads,
      artistAlbumListed: verify.artistAlbumListed,
      error: verify.error,
    });

    if (!verify.pass) {
      stoppedEarly = true;
      stopReason = `verify failed ${proposalId}: ${verify.error}`;
      break;
    }
  }

  const after = await loadGraphMetrics();
  const passed = rows.filter((r) => r.verificationPass);
  const rvtrLinksAdded = passed.reduce((sum, r) => sum + r.rvtrsRecovered.length, 0);

  return {
    wave: "APPLY-25",
    targetCount: WAVE_25_TARGET,
    proposalIds,
    priorCumulativeIds: [...WAVE_10_CUMULATIVE_IDS],
    baseline,
    after,
    preApply,
    rows,
    stoppedEarly,
    stopReason,
    allPassed: !stoppedEarly && passed.length === proposalIds.length,
    stagedIncremental,
    impact: {
      albumsAdded: passed.length,
      rvtrLinksAdded,
      hot100Gain: after.hot100Linked - baseline.hot100Linked,
      albumPageGain: passed.filter((r) => r.albumPageLoads).length,
      artistRelationshipGain: passed.filter((r) => r.artistAlbumListed).length,
    },
    nextQueue: await emptyNext(),
  };
}

function metricsTable(m: GraphMetrics): string {
  return `| Linked RVTRs | ${m.linkedRvtrCount.toLocaleString()} |
| Hot 100 linked | ${m.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${m.hot100Missing.toLocaleString()} |
| Hot 100 linked % | ${m.hot100LinkedPct}% |
| Album count | ${m.albumCount.toLocaleString()} |`;
}

export async function writeWave25ImpactReport(result: Wave25ApplyResult): Promise<string> {
  const report = `# MB Wave 25 — Impact Report

**Generated:** ${new Date().toISOString()}  
**Phase:** 8A — Wave 25 recovery  
**Target:** ${result.targetCount} approve-ready proposals  
**Applied IDs:** ${result.proposalIds.join(", ") || "—"}  
**Result:** ${result.allPassed ? "**ALL PASSED**" : "**INCOMPLETE/FAILED**"}

---

## Impact summary

| Metric | Gain |
|--------|-----:|
| Albums added | **${result.impact.albumsAdded}** |
| RVTR links added | **${result.impact.rvtrLinksAdded}** |
| Hot 100 linked gain | **+${result.impact.hot100Gain}** |
| Album pages navigable | **${result.impact.albumPageGain}** |
| Artist relationships improved | **${result.impact.artistRelationshipGain}** |

${result.stagedIncremental ? `\n**Incremental staging:** ${result.stagedIncremental.approve} approve / ${result.stagedIncremental.staged} groups staged before apply.\n` : ""}
${result.stoppedEarly ? `\n**Stopped early:** ${result.stopReason}\n` : ""}

---

## Baseline

| Metric | Value |
|--------|------:|
${metricsTable(result.baseline)}

---

## After

| Metric | Value |
|--------|------:|
${metricsTable(result.after)}

---

## Per-proposal

| ID | RVTR | Artist | Album | RVAL | RVTRs | Album page | Artist shelf | Verify |
|----|------|--------|-------|------|-------|:----------:|:------------:|--------|
${result.rows
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.artistName} | ${r.albumTitle} | ${r.rval ?? "—"} | ${r.rvtrsRecovered.length} | ${r.albumPageLoads ? "✓" : "✗"} | ${r.artistAlbumListed ? "✓" : "✗"} | ${r.verificationPass ? "PASS" : "FAIL"} |`,
  )
  .join("\n")}

---

## Next queue — approve-ready (post Wave 25)

| ID | RVTR | Artist | Album | RVAL | Weeks | Verdict |
|----|------|--------|-------|------|------:|---------|
${result.nextQueue
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.artistName} | ${r.albumTitle} | ${r.proposedRval} | ${r.chartWeeks} | ${r.verdict} |`,
  )
  .join("\n") || "| — | — | — | — | — | — | — |"}

---

\`\`\`bash
RETROVERSE_MB_INGEST_APPLY=1 npm run mb:wave-25:apply
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-wave-25-impact.md");
  await writeFile(reportPath, report);
  return reportPath;
}
