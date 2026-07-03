import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { appendMbIngestAudit } from "@/lib/healing/mb-ingest/audit";
import { applyMbIngest } from "@/lib/healing/mb-ingest/apply-mb-ingest";
import {
  ensureMbIngestApplySchema,
  loadMbIngestProposal,
  MB_INGEST_AEK_SOURCE,
  MB_INGEST_CAT_SOURCE,
} from "@/lib/healing/mb-ingest/apply-plan";
import { mbIngestApplyEnabled } from "@/lib/healing/mb-ingest/apply-guard";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { loadMissingLinkSummary } from "@/lib/track/album-link-recovery/audit-missing-links";
import { inspectQuery } from "@/lib/inspect/pg";

export const WAVE_5_IDS = [29, 32, 35, 36, 37] as const;
const ACTOR = "mb-wave-5-apply";

export type CoverageMetrics = {
  linkedRvtrCount: number;
  hot100Total: number;
  hot100Linked: number;
  hot100Missing: number;
  hot100LinkedPct: number;
};

export type WaveApplyRowResult = {
  proposalId: number;
  rvtr: string;
  artistName: string;
  trackTitle: string;
  albumTitle: string;
  applied: boolean;
  idempotent: boolean;
  albumId: number | null;
  rval: string | null;
  catRowsInserted: number;
  expectedCatRows: number;
  rvtrsRecovered: string[];
  trackPageAlbums: number;
  verificationPass: boolean;
  error: string | null;
};

export type WaveApplyResult = {
  wave: string;
  proposalIds: number[];
  before: CoverageMetrics;
  after: CoverageMetrics;
  netGainLinkedRvtrs: number;
  netGainHot100Linked: number;
  rows: WaveApplyRowResult[];
  stoppedEarly: boolean;
  stopReason: string | null;
  allPassed: boolean;
};

async function loadCoverageMetrics(): Promise<CoverageMetrics> {
  const [linked, summary] = await Promise.all([
    inspectQuery<{ c: number }>(
      `
      SELECT count(DISTINCT upper(trim(canonical_track_key)))::int AS c
      FROM canonical_album_tracks
      WHERE canonical_track_key IS NOT NULL
        AND trim(canonical_track_key) <> ''
      `,
    ),
    loadMissingLinkSummary(),
  ]);
  const hot100Total = summary?.hot100Total ?? 0;
  const hot100Missing = summary?.hot100MissingLinks ?? 0;
  const hot100Linked = hot100Total - hot100Missing;
  return {
    linkedRvtrCount: linked[0]?.c ?? 0,
    hot100Total,
    hot100Linked,
    hot100Missing,
    hot100LinkedPct:
      hot100Total > 0 ? Math.round((hot100Linked / hot100Total) * 1000) / 10 : 0,
  };
}

async function verifyAppliedProposal(
  proposalId: number,
  albumId: number,
  rval: string,
  rvtrs: string[],
  expectedCatRows: number,
): Promise<{ pass: boolean; error: string | null; catCount: number; trackPageAlbums: number }> {
  const [album, aek, catCount, ...rvtrChecks] = await Promise.all([
    inspectQuery<{ id: number }>(`SELECT id FROM albums WHERE id=$1 LIMIT 1`, [albumId]),
    inspectQuery<{ external_key: string }>(
      `SELECT external_key FROM album_external_keys WHERE upper(trim(external_key))=$1 AND source=$2 LIMIT 1`,
      [rval, MB_INGEST_AEK_SOURCE],
    ),
    inspectQuery<{ c: number }>(
      `
      SELECT count(*)::int AS c FROM canonical_album_tracks
      WHERE album_id=$1 AND canonical_source=$2
      `,
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
  const trackPageAlbums = trackPage?.albums.length ?? 0;
  const catRows = catCount[0]?.c ?? 0;

  if (!album[0]) return { pass: false, error: "album row missing", catCount: catRows, trackPageAlbums };
  if (!aek[0]) return { pass: false, error: "RVAL row missing", catCount: catRows, trackPageAlbums };
  if (catRows !== expectedCatRows) {
    return {
      pass: false,
      error: `expected ${expectedCatRows} CAT rows, got ${catRows}`,
      catCount: catRows,
      trackPageAlbums,
    };
  }
  for (let i = 0; i < rvtrs.length; i += 1) {
    if (!rvtrChecks[i]?.[0]) {
      return {
        pass: false,
        error: `${rvtrs[i]} not linked`,
        catCount: catRows,
        trackPageAlbums,
      };
    }
  }
  if (trackPageAlbums < 1) {
    return {
      pass: false,
      error: `track page shows ${trackPageAlbums} albums`,
      catCount: catRows,
      trackPageAlbums,
    };
  }

  const proposal = await loadMbIngestProposal(proposalId);
  if (proposal?.status !== "applied") {
    return {
      pass: false,
      error: `proposal status ${proposal?.status}`,
      catCount: catRows,
      trackPageAlbums,
    };
  }

  return { pass: true, error: null, catCount: catRows, trackPageAlbums };
}

export async function runWave5Apply(): Promise<WaveApplyResult> {
  const rows: WaveApplyRowResult[] = [];
  let stoppedEarly = false;
  let stopReason: string | null = null;

  if (!mbIngestApplyEnabled()) {
    return {
      wave: "READY-APPLY-5",
      proposalIds: [...WAVE_5_IDS],
      before: await loadCoverageMetrics(),
      after: await loadCoverageMetrics(),
      netGainLinkedRvtrs: 0,
      netGainHot100Linked: 0,
      rows: [],
      stoppedEarly: true,
      stopReason: "RETROVERSE_MB_INGEST_APPLY=1 not set",
      allPassed: false,
    };
  }

  await ensureMbIngestApplySchema();
  const before = await loadCoverageMetrics();

  for (const proposalId of WAVE_5_IDS) {
    const proposal = await loadMbIngestProposal(proposalId);
    if (!proposal) {
      const row: WaveApplyRowResult = {
        proposalId,
        rvtr: "—",
        artistName: "—",
        trackTitle: "—",
        albumTitle: "—",
        applied: false,
        idempotent: false,
        albumId: null,
        rval: null,
        catRowsInserted: 0,
        expectedCatRows: 0,
        rvtrsRecovered: [],
        trackPageAlbums: 0,
        verificationPass: false,
        error: "proposal not found",
      };
      rows.push(row);
      stoppedEarly = true;
      stopReason = `proposal ${proposalId} not found`;
      break;
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
      message: `Wave-5 apply start for proposal ${proposalId}.`,
    });

    const applyResult = await applyMbIngest(proposalId, ACTOR);

    if (!applyResult.ok) {
      await appendMbIngestAudit({
        action: "apply",
        batchName: proposal.batch_name,
        rvtr: proposal.rvtr,
        proposalId,
        actor: ACTOR,
        ok: false,
        message: `Wave-5 apply failed: ${applyResult.message}`,
      });
      rows.push({
        proposalId,
        rvtr: proposal.rvtr,
        artistName: proposal.artist_name,
        trackTitle: proposal.track_title,
        albumTitle: proposal.proposed_album_title,
        applied: false,
        idempotent: false,
        albumId: null,
        rval: proposal.proposed_rval,
        catRowsInserted: 0,
        expectedCatRows,
        rvtrsRecovered: rvtrs,
        trackPageAlbums: 0,
        verificationPass: false,
        error: applyResult.message,
      });
      stoppedEarly = true;
      stopReason = `apply failed on proposal ${proposalId}: ${applyResult.message}`;
      break;
    }

    const verify = await verifyAppliedProposal(
      proposalId,
      applyResult.albumId,
      applyResult.rval,
      applyResult.linkedRvtrs,
      expectedCatRows,
    );

    const row: WaveApplyRowResult = {
      proposalId,
      rvtr: proposal.rvtr,
      artistName: proposal.artist_name,
      trackTitle: proposal.track_title,
      albumTitle: proposal.proposed_album_title,
      applied: true,
      idempotent: applyResult.idempotent,
      albumId: applyResult.albumId,
      rval: applyResult.rval,
      catRowsInserted: verify.catCount,
      expectedCatRows,
      rvtrsRecovered: applyResult.linkedRvtrs,
      trackPageAlbums: verify.trackPageAlbums,
      verificationPass: verify.pass,
      error: verify.error,
    };
    rows.push(row);

    await appendMbIngestAudit({
      action: "apply",
      batchName: proposal.batch_name,
      rvtr: proposal.rvtr,
      proposalId,
      proposedRval: applyResult.rval,
      actor: ACTOR,
      ok: verify.pass,
      message: verify.pass
        ? `Wave-5 verify pass. album=${applyResult.albumId} CAT=${verify.catCount} RVAL=${applyResult.rval}`
        : `Wave-5 verify FAIL: ${verify.error}`,
      signals: applyResult.linkedRvtrs,
    });

    if (!verify.pass) {
      stoppedEarly = true;
      stopReason = `verification failed on proposal ${proposalId}: ${verify.error}`;
      break;
    }
  }

  const after = await loadCoverageMetrics();
  const appliedRvtrs = rows.filter((r) => r.verificationPass).flatMap((r) => r.rvtrsRecovered);

  return {
    wave: "READY-APPLY-5",
    proposalIds: [...WAVE_5_IDS],
    before,
    after,
    netGainLinkedRvtrs: after.linkedRvtrCount - before.linkedRvtrCount,
    netGainHot100Linked: after.hot100Linked - before.hot100Linked,
    rows,
    stoppedEarly,
    stopReason,
    allPassed: !stoppedEarly && rows.length === WAVE_5_IDS.length && rows.every((r) => r.verificationPass),
  };
}

function rowTable(rows: WaveApplyRowResult[]): string {
  if (rows.length === 0) return "_None_";
  return rows
    .map(
      (r) =>
        `| ${r.proposalId} | ${r.rvtr} | ${r.artistName} | ${r.trackTitle} | ${r.albumTitle} | ${r.albumId ?? "—"} | ${r.rval ?? "—"} | ${r.catRowsInserted}/${r.expectedCatRows} | ${r.rvtrsRecovered.join(", ")} | ${r.verificationPass ? "**PASS**" : "**FAIL**"} | ${r.error ?? "—"} |`,
    )
    .join("\n");
}

export async function writeWave5ApplyReport(result: WaveApplyResult): Promise<string> {
  const generatedAt = new Date().toISOString();
  const appliedCount = result.rows.filter((r) => r.verificationPass).length;

  const proceed10 =
    result.allPassed && appliedCount === 5
      ? "**YES** — all 5 verified; rollback proven on proposal 29 in 5I; proceed to Apply-10 after quick re-readiness pass on IDs 30, 38, 46, 40, 41."
      : result.stoppedEarly
        ? `**NO** — stopped early: ${result.stopReason}`
        : `**NO** — only ${appliedCount}/5 passed verification`;

  const report = `# MB Wave 5 — Production Apply

**Generated:** ${generatedAt}  
**Phase:** 6A — First production recovery wave  
**Wave:** READY APPLY 5  
**IDs:** ${result.proposalIds.join(", ")}  
**Result:** ${result.allPassed ? "**ALL PASSED**" : "**INCOMPLETE/FAILED**"}

---

## Coverage — before

| Metric | Value |
|--------|------:|
| Linked RVTR count (all) | ${result.before.linkedRvtrCount.toLocaleString()} |
| Hot 100 total | ${result.before.hot100Total.toLocaleString()} |
| Hot 100 linked | ${result.before.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${result.before.hot100Missing.toLocaleString()} |
| Hot 100 linked % | ${result.before.hot100LinkedPct}% |

---

## Per-proposal apply

| ID | RVTR | Artist | Track | Album | Album ID | RVAL | CAT rows | RVTRs recovered | Verify | Error |
|----|------|--------|-------|-------|----------|------|----------|-----------------|--------|-------|
${rowTable(result.rows)}

${result.stoppedEarly ? `\n**Stopped early:** ${result.stopReason}\n` : ""}

---

## Coverage — after

| Metric | Value |
|--------|------:|
| Linked RVTR count (all) | ${result.after.linkedRvtrCount.toLocaleString()} |
| Hot 100 total | ${result.after.hot100Total.toLocaleString()} |
| Hot 100 linked | ${result.after.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${result.after.hot100Missing.toLocaleString()} |
| Hot 100 linked % | ${result.after.hot100LinkedPct}% |

---

## Net gain

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Linked RVTRs | ${result.before.linkedRvtrCount.toLocaleString()} | ${result.after.linkedRvtrCount.toLocaleString()} | **+${result.netGainLinkedRvtrs}** |
| Hot 100 linked | ${result.before.hot100Linked.toLocaleString()} | ${result.after.hot100Linked.toLocaleString()} | **+${result.netGainHot100Linked}** |
| Hot 100 missing | ${result.before.hot100Missing.toLocaleString()} | ${result.after.hot100Missing.toLocaleString()} | ${result.after.hot100Missing - result.before.hot100Missing} |

---

## Proceed to Apply-10?

${proceed10}

Recommended Apply-10 IDs (from 5G): **29, 30, 32, 35, 36, 37, 38, 46, 40, 41** — note 29–37 already applied in this wave; next wave adds **30, 38, 46, 40, 41**.

---

## Commands

\`\`\`bash
RETROVERSE_MB_INGEST_APPLY=1 npm run mb:wave-5:apply
\`\`\`

Audit: \`RETROVERSE_DATA/ops/healing/mb-ingest-audit.jsonl\`
`;

  const reportPath = join(process.cwd(), "reports/mb-wave-5-apply.md");
  await writeFile(reportPath, report);
  return reportPath;
}
