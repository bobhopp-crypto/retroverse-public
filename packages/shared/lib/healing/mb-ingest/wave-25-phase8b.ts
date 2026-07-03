import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { slugFromArtistName } from "@/lib/artist/slug";
import { runApplyReadinessReview } from "@/lib/healing/mb-ingest/apply-readiness";
import { loadMbIngestProposal } from "@/lib/healing/mb-ingest/apply-plan";
import { MB_INGEST_AEK_SOURCE, MB_INGEST_CAT_SOURCE } from "@/lib/healing/mb-ingest/apply-plan";
import {
  loadGraphMetrics,
  WAVE_10_CUMULATIVE_IDS,
  type GraphMetrics,
} from "@/lib/healing/mb-ingest/wave-10-apply";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { trackPageHref } from "@/lib/search/entity-routes";
import { inspectQuery } from "@/lib/inspect/pg";

/** Wave 25 new applies (Phase 8A/8B) — excludes Wave 5+10. */
export const WAVE_25_NEW_IDS = [
  57, 58, 59, 60, 61, 62, 63, 64, 104, 66, 67, 68, 69, 48, 71, 143, 72, 73, 74, 75, 76, 77, 79,
  80, 81,
] as const;

export const WAVE_25_CUMULATIVE_IDS = [...WAVE_10_CUMULATIVE_IDS, ...WAVE_25_NEW_IDS] as const;

export type Wave25Baseline = GraphMetrics & {
  mbIngestedAlbumCount: number;
};

export type Wave25VerifyRow = {
  proposalId: number;
  rvtr: string;
  artistName: string;
  albumTitle: string;
  rval: string | null;
  rvtrsRecovered: string[];
  mergedRecovery: boolean;
  albumRow: boolean;
  rvalRow: boolean;
  catRows: number;
  expectedCatRows: number;
  rvtrLinked: boolean;
  trackPageAlbums: number;
  albumPageLoads: boolean;
  artistAlbumListed: boolean;
  pass: boolean;
  error: string | null;
};

export type Wave25RealWorldRow = {
  rvtr: string;
  trackUrl: string;
  albumUrl: string;
  albumModule: boolean;
  albumPage: boolean;
  chartWeeks: number;
  pacing: string;
};

export type Wave25Phase8BResult = {
  generatedAt: string;
  phase: "8B";
  wave25AlreadyApplied: boolean;
  proposalsApplied: number[];
  readiness: {
    ready: number;
    needsReview: number;
    blocked: number;
    readyIds: number[];
  };
  baseline: Wave25Baseline;
  current: Wave25Baseline;
  wave25Delta: {
    albumsAdded: number;
    rvtrLinksAdded: number;
    hot100Gain: number;
    mergedGroups: number;
  };
  verifyRows: Wave25VerifyRow[];
  realWorldRows: Wave25RealWorldRow[];
  failures: string[];
  allVerified: boolean;
  realWorldSummary: {
    trackPagesWithAlbum: number;
    albumPagesLive: number;
    artistShelfHits: number;
    totalRvtrs: number;
  };
  nextQueue: Array<{
    proposalId: number;
    rvtr: string;
    artistName: string;
    albumTitle: string;
    proposedRval: string;
    chartWeeks: number;
  }>;
};

export async function loadMbIngestedAlbumCount(): Promise<number> {
  const rows = await inspectQuery<{ c: number }>(
    `
    SELECT count(DISTINCT al.id)::int AS c
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE aek.source = $1
    `,
    [MB_INGEST_AEK_SOURCE],
  );
  return rows[0]?.c ?? 0;
}

export async function loadWave25Baseline(): Promise<Wave25Baseline> {
  const [metrics, mbIngestedAlbumCount] = await Promise.all([
    loadGraphMetrics(),
    loadMbIngestedAlbumCount(),
  ]);
  return { ...metrics, mbIngestedAlbumCount };
}

async function verifyWave25Proposal(proposalId: number): Promise<Wave25VerifyRow> {
  const proposal = await loadMbIngestProposal(proposalId);
  if (!proposal || proposal.status !== "applied") {
    return {
      proposalId,
      rvtr: proposal?.rvtr ?? "—",
      artistName: proposal?.artist_name ?? "—",
      albumTitle: proposal?.proposed_album_title ?? "—",
      rval: null,
      rvtrsRecovered: [],
      mergedRecovery: false,
      albumRow: false,
      rvalRow: false,
      catRows: 0,
      expectedCatRows: 0,
      rvtrLinked: false,
      trackPageAlbums: 0,
      albumPageLoads: false,
      artistAlbumListed: false,
      pass: false,
      error: proposal ? `status ${proposal.status}` : "proposal missing",
    };
  }

  const rvtrs =
    proposal.track_recoveries_json.length > 0
      ? proposal.track_recoveries_json.map((r) => r.rvtr.trim().toUpperCase())
      : [proposal.rvtr.trim().toUpperCase()];
  const rval = (proposal.applied_rval ?? proposal.proposed_rval).trim().toUpperCase();
  const albumId = proposal.applied_album_id!;
  const expectedCatRows = proposal.proposed_tracklist_json.length;

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
        `SELECT 1 AS rvtr FROM canonical_album_tracks WHERE upper(trim(canonical_track_key))=$1 LIMIT 1`,
        [rvtr],
      ),
    ),
  ]);

  const trackPage = await loadTrackPage(rvtrs[0]!);
  const albumPage = await loadAlbumPage(rval);
  const artistPage = await loadArtistPage(slugFromArtistName(proposal.artist_name));
  const artistAlbumListed = Boolean(
    artistPage?.essentialAlbums?.some(
      (a) =>
        a.rval?.toUpperCase() === rval ||
        a.title.trim().toLowerCase() === proposal.proposed_album_title.trim().toLowerCase(),
    ),
  );

  const catRows = catCount[0]?.c ?? 0;
  const rvtrLinked = rvtrChecks.every((r) => r.length > 0);
  const errors: string[] = [];
  if (!album[0]) errors.push("album row missing");
  if (!aek[0]) errors.push("RVAL missing");
  if (catRows !== expectedCatRows) errors.push(`CAT ${catRows}/${expectedCatRows}`);
  if (!rvtrLinked) errors.push("RVTR not linked");
  if ((trackPage?.albums.length ?? 0) < 1) errors.push("track page no album module");

  return {
    proposalId,
    rvtr: proposal.rvtr,
    artistName: proposal.artist_name,
    albumTitle: proposal.proposed_album_title,
    rval,
    rvtrsRecovered: rvtrs,
    mergedRecovery: rvtrs.length > 1,
    albumRow: Boolean(album[0]),
    rvalRow: Boolean(aek[0]),
    catRows,
    expectedCatRows,
    rvtrLinked,
    trackPageAlbums: trackPage?.albums.length ?? 0,
    albumPageLoads: Boolean(albumPage),
    artistAlbumListed,
    pass: errors.length === 0,
    error: errors.length ? errors.join("; ") : null,
  };
}

function derivePacing(coverVisible: boolean, albumCount: number): string {
  if (albumCount > 0 && coverVisible) return "coherent";
  if (albumCount > 0) return "partial";
  return "weak";
}

export async function runWave25Phase8B(): Promise<Wave25Phase8BResult> {
  const current = await loadWave25Baseline();
  const readiness = await runApplyReadinessReview();

  const appliedRows = await inspectQuery<{ proposal_id: number; status: string }>(
    `SELECT proposal_id, status FROM mb_album_ingest_proposals WHERE proposal_id = ANY($1::int[])`,
    [[...WAVE_25_NEW_IDS]],
  );
  const appliedSet = new Set(
    appliedRows.filter((r) => r.status === "applied").map((r) => Number(r.proposal_id)),
  );
  const wave25AlreadyApplied = appliedSet.size === WAVE_25_NEW_IDS.length;

  const verifyRows: Wave25VerifyRow[] = [];
  for (const id of WAVE_25_NEW_IDS) {
    verifyRows.push(await verifyWave25Proposal(id));
  }

  const failures = verifyRows.filter((r) => !r.pass).map((r) => `${r.proposalId}: ${r.error}`);
  const rvtrLinksAdded = verifyRows.reduce((s, r) => s + r.rvtrsRecovered.length, 0);
  const mergedGroups = verifyRows.filter((r) => r.mergedRecovery).length;

  const realWorldRows: Wave25RealWorldRow[] = [];
  const seenRvtr = new Set<string>();
  for (const row of verifyRows) {
    for (const rvtr of row.rvtrsRecovered) {
      if (seenRvtr.has(rvtr)) continue;
      seenRvtr.add(rvtr);
      const page = await loadTrackPage(rvtr);
      const pacing = derivePacing(Boolean(page?.coverUrl), page?.albums.length ?? 0);
      realWorldRows.push({
        rvtr,
        trackUrl: trackPageHref(rvtr),
        albumUrl: row.rval ? `/album/${row.rval}` : "—",
        albumModule: (page?.albums.length ?? 0) > 0,
        albumPage: row.albumPageLoads,
        chartWeeks: page?.chartWeeks ?? 0,
        pacing,
      });
    }
  }

  const appliedIds = [...WAVE_25_NEW_IDS].filter((id) => appliedSet.has(id));
  const baseline: Wave25Baseline = {
    ...current,
    linkedRvtrCount: current.linkedRvtrCount - rvtrLinksAdded,
    hot100Linked: current.hot100Linked - rvtrLinksAdded,
    hot100Missing: current.hot100Missing + rvtrLinksAdded,
    hot100LinkedPct:
      current.hot100Total > 0
        ? Math.round(((current.hot100Linked - rvtrLinksAdded) / current.hot100Total) * 1000) / 10
        : 0,
    albumCount: current.albumCount - appliedIds.length,
    mbIngestedAlbumCount: current.mbIngestedAlbumCount - appliedIds.length,
  };

  const appliedProposalSet = await inspectQuery<{ proposal_id: number }>(
    `SELECT proposal_id FROM mb_album_ingest_proposals WHERE status = 'applied'`,
  );
  const appliedAll = new Set(appliedProposalSet.map((r) => Number(r.proposal_id)));

  const nextQueue = readiness.ready
    .filter((r) => !appliedAll.has(r.proposalId))
    .sort((a, b) => b.chartWeeks - a.chartWeeks)
    .slice(0, 25)
    .map((r) => ({
      proposalId: r.proposalId,
      rvtr: r.rvtr,
      artistName: r.artistName,
      albumTitle: r.albumTitle,
      proposedRval: r.proposedRval,
      chartWeeks: r.chartWeeks,
    }));

  return {
    generatedAt: new Date().toISOString(),
    phase: "8B",
    wave25AlreadyApplied,
    proposalsApplied: appliedIds,
    readiness: {
      ready: readiness.ready.length,
      needsReview: readiness.needsReview.length,
      blocked: readiness.blocked.length,
      readyIds: readiness.ready.map((r) => r.proposalId),
    },
    baseline,
    current,
    wave25Delta: {
      albumsAdded: appliedIds.length,
      rvtrLinksAdded,
      hot100Gain: rvtrLinksAdded,
      mergedGroups,
    },
    verifyRows,
    realWorldRows,
    failures,
    allVerified: failures.length === 0,
    realWorldSummary: {
      trackPagesWithAlbum: realWorldRows.filter((r) => r.albumModule).length,
      albumPagesLive: realWorldRows.filter((r) => r.albumPage).length,
      artistShelfHits: verifyRows.filter((r) => r.artistAlbumListed).length,
      totalRvtrs: realWorldRows.length,
    },
    nextQueue,
  };
}

function baselineTable(b: Wave25Baseline): string {
  return `| Linked RVTRs | ${b.linkedRvtrCount.toLocaleString()} |
| Hot 100 linked | ${b.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${b.hot100Missing.toLocaleString()} |
| Hot 100 linked % | ${b.hot100LinkedPct}% |
| Album count | ${b.albumCount.toLocaleString()} |
| MB-ingested albums | ${b.mbIngestedAlbumCount.toLocaleString()} |`;
}

export async function writeWave25Phase8BReport(result: Wave25Phase8BResult): Promise<string> {
  const merged = result.verifyRows.filter((r) => r.mergedRecovery);

  const report = `# MB Wave 25 — Impact Report

**Generated:** ${result.generatedAt}  
**Phase:** 8B — Wave 25 recovery (verify + real-world audit)  
**Apply status:** ${result.wave25AlreadyApplied ? "**COMPLETE** (25/25 applied)" : `**PARTIAL** (${result.proposalsApplied.length}/25)`}  
**Verification:** ${result.allVerified ? "**ALL PASSED**" : "**FAILURES**"}

---

## Pre-apply baseline (reconstructed)

| Metric | Value |
|--------|------:|
${baselineTable(result.baseline)}

---

## Readiness at audit time

| Verdict | Count | Notes |
|---------|------:|-------|
| READY | **${result.readiness.ready}** | Approve-ready only — NEEDS_REVIEW excluded from apply |
| NEEDS_REVIEW | ${result.readiness.needsReview} | Not applied |
| BLOCKED | ${result.readiness.blocked} | Not applied |

---

## Wave 25 apply summary

| Metric | Value |
|--------|------:|
| Proposals applied | **${result.proposalsApplied.length}** |
| Albums created | **${result.wave25Delta.albumsAdded}** |
| RVTR relationships created | **${result.wave25Delta.rvtrLinksAdded}** |
| Merged group recoveries | **${result.wave25Delta.mergedGroups}** |
| Hot 100 gain | **+${result.wave25Delta.hot100Gain}** |
| Failures | **${result.failures.length}** |

**Proposal IDs:** ${result.proposalsApplied.join(", ") || "—"}

### Merged groups

${merged.length ? merged.map((r) => `- **${r.proposalId}** ${r.albumTitle} — ${r.rvtrsRecovered.join(", ")}`).join("\n") : "_none_"}

### Failures

${result.failures.length ? result.failures.map((f) => `- ${f}`).join("\n") : "_none_"}

---

## After apply (current)

| Metric | Value |
|--------|------:|
${baselineTable(result.current)}

---

## Per-proposal verification

| ID | RVTR | Album | RVAL | RVTRs | Album | RVAL | CAT | RVTR link | Track module | Album page | Artist | Pass |
|----|------|-------|------|------:|:-----:|:----:|:---:|:------------:|:----------:|:------:|:----:|
${result.verifyRows
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.albumTitle} | ${r.rval ?? "—"} | ${r.rvtrsRecovered.length} | ${r.albumRow ? "✓" : "✗"} | ${r.rvalRow ? "✓" : "✗"} | ${r.catRows}/${r.expectedCatRows} | ${r.rvtrLinked ? "✓" : "✗"} | ${r.trackPageAlbums > 0 ? "✓" : "✗"} | ${r.albumPageLoads ? "✓" : "✗"} | ${r.artistAlbumListed ? "✓" : "✗"} | ${r.pass ? "PASS" : "FAIL"} |`,
  )
  .join("\n")}

---

## Real-world audit (Wave 25 RVTRs)

| Metric | Result |
|--------|------:|
| Track pages with album module | **${result.realWorldSummary.trackPagesWithAlbum}** / ${result.realWorldSummary.totalRvtrs} |
| Album pages live | **${result.realWorldSummary.albumPagesLive}** / ${result.wave25Delta.albumsAdded} |
| Artist shelf hits | **${result.realWorldSummary.artistShelfHits}** / ${result.wave25Delta.albumsAdded} |

| RVTR | Track | Album page | Module | Chart weeks | Pacing |
|------|-------|:----------:|:------:|------------:|--------|
${result.realWorldRows
  .map(
    (r) =>
      `| ${r.rvtr} | [track](${r.trackUrl}) | [album](${r.albumUrl}) | ${r.albumModule ? "✓" : "✗"} | ${r.chartWeeks} | ${r.pacing} |`,
  )
  .join("\n")}

**Covers:** not run in Phase 8B (deferred).

---

## Recommendation — Wave 50

Apply next **25** approve-ready proposals from queue below. Preconditions:

1. \`npm run mb:canary:apply-readiness\` — confirm ≥25 READY, 0 BLOCKED on target IDs
2. \`RETROVERSE_MB_INGEST_APPLY=1 npm run mb:wave-50:apply\` (to be wired)
3. Cover publish optional after apply via \`RETROVERSE_MB_COVER_APPLY=1\`

**Next queue (top 25 READY, post Wave 25):**

| ID | RVTR | Artist | Album | RVAL | Weeks |
|----|------|--------|-------|------|------:|
${result.nextQueue
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.artistName} | ${r.albumTitle} | ${r.proposedRval} | ${r.chartWeeks} |`,
  )
  .join("\n")}

---

\`\`\`bash
npm run mb:wave-25:impact
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-wave-25-impact.md");
  await writeFile(reportPath, report);
  const jsonPath = join(process.cwd(), "tools/out/mb-wave-25-phase8b.json");
  await writeFile(jsonPath, JSON.stringify(result, null, 2));
  return reportPath;
}
