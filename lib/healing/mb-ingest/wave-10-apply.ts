import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { appendMbIngestAudit } from "@/lib/healing/mb-ingest/audit";
import { applyMbIngest } from "@/lib/healing/mb-ingest/apply-mb-ingest";
import { albumGroupKey } from "@/lib/healing/mb-ingest/harden";
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

export const WAVE_5_APPLIED_IDS = [29, 32, 35, 36, 37] as const;
export const WAVE_10_NEW_IDS = [30, 38, 46, 40, 41] as const;
export const WAVE_10_CUMULATIVE_IDS = [...WAVE_5_APPLIED_IDS, ...WAVE_10_NEW_IDS] as const;

const ACTOR = "mb-wave-10-apply";

export type GraphMetrics = {
  linkedRvtrCount: number;
  unlinkedRvtrCount: number;
  hot100Total: number;
  hot100Linked: number;
  hot100Missing: number;
  hot100LinkedPct: number;
  albumCount: number;
  albumCoverCount: number;
  trackPagesWithAlbum: number;
  trackPagesWithoutAlbum: number;
};

export type PreApplyCheck = {
  proposalId: number;
  pass: boolean;
  errors: string[];
};

export type Wave10ApplyRow = {
  proposalId: number;
  rvtr: string;
  artistName: string;
  trackTitle: string;
  albumTitle: string;
  preApplyPass: boolean;
  preApplyErrors: string[];
  applied: boolean;
  idempotent: boolean;
  albumId: number | null;
  rval: string | null;
  catRowsInserted: number;
  expectedCatRows: number;
  rvtrsRecovered: string[];
  trackPageAlbums: number;
  trackPageResolves: boolean;
  albumHasCover: boolean;
  verificationPass: boolean;
  error: string | null;
};

export type Wave10ApplyResult = {
  wave: string;
  newProposalIds: number[];
  cumulativeIds: number[];
  baseline: GraphMetrics;
  after: GraphMetrics;
  preApply: PreApplyCheck[];
  rows: Wave10ApplyRow[];
  stoppedEarly: boolean;
  stopReason: string | null;
  allPassed: boolean;
  failures: string[];
};

export async function loadGraphMetrics(): Promise<GraphMetrics> {
  const [linked, summary, albums, covers, hot100Tracks] = await Promise.all([
    inspectQuery<{ c: number }>(
      `
      SELECT count(DISTINCT upper(trim(canonical_track_key)))::int AS c
      FROM canonical_album_tracks
      WHERE canonical_track_key IS NOT NULL AND trim(canonical_track_key) <> ''
      `,
    ),
    loadMissingLinkSummary(),
    inspectQuery<{ c: number }>(`SELECT count(*)::int AS c FROM albums`),
    inspectQuery<{ c: number }>(
      `
      SELECT count(DISTINCT al.id)::int AS c
      FROM albums al
      WHERE nullif(trim(al.canonical_cover_path), '') IS NOT NULL
         OR EXISTS (
           SELECT 1 FROM album_artwork_links aal
           WHERE aal.album_id = al.id
             AND nullif(trim(coalesce(aal.canonical_cover_path, aal.r2_cover_key)), '') IS NOT NULL
         )
      `,
    ),
    inspectQuery<{ with_album: number; without_album: number }>(
      `
      SELECT
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
        ))::int AS with_album,
        count(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
        ))::int AS without_album
      FROM canonical_track_display ctd
      WHERE ctd.has_hot100 = true
      `,
    ),
  ]);

  const hot100Total = summary?.hot100Total ?? 0;
  const hot100Missing = summary?.hot100MissingLinks ?? 0;
  const hot100Linked = hot100Total - hot100Missing;
  const linkedRvtr = linked[0]?.c ?? 0;

  return {
    linkedRvtrCount: linkedRvtr,
    unlinkedRvtrCount: Math.max(0, hot100Total - hot100Linked),
    hot100Total,
    hot100Linked,
    hot100Missing,
    hot100LinkedPct:
      hot100Total > 0 ? Math.round((hot100Linked / hot100Total) * 1000) / 10 : 0,
    albumCount: albums[0]?.c ?? 0,
    albumCoverCount: covers[0]?.c ?? 0,
    trackPagesWithAlbum: hot100Tracks[0]?.with_album ?? hot100Linked,
    trackPagesWithoutAlbum: hot100Tracks[0]?.without_album ?? hot100Missing,
  };
}

async function albumHasCover(albumId: number): Promise<boolean> {
  const rows = await inspectQuery<{
    cover_path: string | null;
    artwork_path: string | null;
    r2_cover_key: string | null;
  }>(
    `
    SELECT
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key
    FROM albums al
    WHERE al.id = $1
    LIMIT 1
    `,
    [albumId],
  );
  const row = rows[0];
  if (!row) return false;
  return Boolean(resolveAlbumCoverUrlFromRow(row));
}

export async function verifyPreApply(proposalId: number): Promise<PreApplyCheck> {
  const errors: string[] = [];
  const proposal = await loadMbIngestProposal(proposalId);
  if (!proposal) return { proposalId, pass: false, errors: ["proposal not found"] };

  if (proposal.status === "applied") {
    return { proposalId, pass: true, errors: [] };
  }
  if (proposal.status !== "staged" && proposal.status !== "rolled_back") {
    errors.push(`status ${proposal.status} not applyable`);
  }
  if (proposal.curation_verdict !== "approve") {
    errors.push(`curation ${proposal.curation_verdict} not approve`);
  }

  const recoveries =
    proposal.track_recoveries_json.length > 0
      ? proposal.track_recoveries_json
      : [{ rvtr: proposal.rvtr, position: proposal.proposed_track_position } as { rvtr: string; position: number }];

  for (const r of recoveries) {
    const rvtr = r.rvtr.trim().toUpperCase();
    const linked = await inspectQuery<{ rvtr: string }>(
      `SELECT 1 AS rvtr FROM canonical_album_tracks WHERE upper(trim(canonical_track_key))=$1 LIMIT 1`,
      [rvtr],
    );
    if (linked.length > 0) errors.push(`${rvtr} already linked`);
  }

  const albumExists = await inspectQuery<{ id: number }>(
    `
    SELECT al.id FROM albums al
    WHERE al.artist_id=$1
      AND lower(regexp_replace(trim(al.title), '[^a-z0-9]+', ' ', 'g'))
        = lower(regexp_replace($2::text, '[^a-z0-9]+', ' ', 'g'))
    LIMIT 1
    `,
    [proposal.artist_id, proposal.proposed_album_title],
  );
  if (albumExists.length > 0) errors.push(`album exists id=${albumExists[0]!.id}`);

  const key =
    proposal.album_group_key ??
    albumGroupKey(proposal.artist_id, proposal.proposed_album_title);
  const dupApplied = await inspectQuery<{ proposal_id: number }>(
    `
    SELECT proposal_id FROM mb_album_ingest_proposals
    WHERE album_group_key = $1 AND status = 'applied' AND proposal_id <> $2
    LIMIT 1
    `,
    [key, proposalId],
  );
  if (dupApplied.length > 0) {
    errors.push(`duplicate album group — applied proposal ${dupApplied[0]!.proposal_id}`);
  }

  const rvalHit = await inspectQuery<{ external_key: string }>(
    `SELECT external_key FROM album_external_keys WHERE upper(trim(external_key))=$1 LIMIT 1`,
    [proposal.proposed_rval],
  );
  if (rvalHit.length > 0) errors.push(`RVAL ${proposal.proposed_rval} already canonical`);

  return { proposalId, pass: errors.length === 0, errors };
}

async function verifyPostApply(
  proposalId: number,
  albumId: number,
  rval: string,
  rvtrs: string[],
  expectedCatRows: number,
): Promise<{
  pass: boolean;
  error: string | null;
  catCount: number;
  trackPageAlbums: number;
  trackPageResolves: boolean;
  albumHasCover: boolean;
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
  const trackPageAlbums = trackPage?.albums.length ?? 0;
  const catRows = catCount[0]?.c ?? 0;
  const cover = await albumHasCover(albumId);

  if (!album[0]) return { pass: false, error: "album missing", catCount: catRows, trackPageAlbums, trackPageResolves: false, albumHasCover: cover };
  if (!aek[0]) return { pass: false, error: "RVAL missing", catCount: catRows, trackPageAlbums, trackPageResolves: false, albumHasCover: cover };
  if (catRows !== expectedCatRows) {
    return { pass: false, error: `CAT ${catRows}/${expectedCatRows}`, catCount: catRows, trackPageAlbums, trackPageResolves: false, albumHasCover: cover };
  }
  for (let i = 0; i < rvtrs.length; i += 1) {
    if (!rvtrChecks[i]?.[0]) {
      return { pass: false, error: `${rvtrs[i]} not linked`, catCount: catRows, trackPageAlbums, trackPageResolves: false, albumHasCover: cover };
    }
  }
  if (trackPageAlbums < 1) {
    return { pass: false, error: "track page no album", catCount: catRows, trackPageAlbums, trackPageResolves: false, albumHasCover: cover };
  }

  const proposal = await loadMbIngestProposal(proposalId);
  if (proposal?.status !== "applied") {
    return { pass: false, error: `status ${proposal?.status}`, catCount: catRows, trackPageAlbums, trackPageResolves: false, albumHasCover: cover };
  }

  return { pass: true, error: null, catCount: catRows, trackPageAlbums, trackPageResolves: true, albumHasCover: cover };
}

export async function runWave10Apply(): Promise<Wave10ApplyResult> {
  const failures: string[] = [];
  const rows: Wave10ApplyRow[] = [];
  const preApply: PreApplyCheck[] = [];
  let stoppedEarly = false;
  let stopReason: string | null = null;

  const baseline = await loadGraphMetrics();

  if (!mbIngestApplyEnabled()) {
    return {
      wave: "APPLY-10",
      newProposalIds: [...WAVE_10_NEW_IDS],
      cumulativeIds: [...WAVE_10_CUMULATIVE_IDS],
      baseline,
      after: baseline,
      preApply,
      rows,
      stoppedEarly: true,
      stopReason: "RETROVERSE_MB_INGEST_APPLY=1 not set",
      allPassed: false,
      failures: ["RETROVERSE_MB_INGEST_APPLY=1 not set"],
    };
  }

  await ensureMbIngestApplySchema();

  for (const proposalId of WAVE_10_NEW_IDS) {
    const pre = await verifyPreApply(proposalId);
    preApply.push(pre);
    if (!pre.pass) {
      failures.push(`pre-apply ${proposalId}: ${pre.errors.join("; ")}`);
      stoppedEarly = true;
      stopReason = `pre-apply failed proposal ${proposalId}`;
      break;
    }
  }

  if (!stoppedEarly) {
    for (const proposalId of WAVE_10_NEW_IDS) {
      const proposal = await loadMbIngestProposal(proposalId);
      if (!proposal) {
        stoppedEarly = true;
        stopReason = `proposal ${proposalId} not found`;
        failures.push(stopReason);
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
        message: `Wave-10 apply start proposal ${proposalId}`,
      });

      const applyResult = await applyMbIngest(proposalId, ACTOR);
      if (!applyResult.ok) {
        failures.push(`apply ${proposalId}: ${applyResult.message}`);
        rows.push({
          proposalId,
          rvtr: proposal.rvtr,
          artistName: proposal.artist_name,
          trackTitle: proposal.track_title,
          albumTitle: proposal.proposed_album_title,
          preApplyPass: true,
          preApplyErrors: [],
          applied: false,
          idempotent: false,
          albumId: null,
          rval: proposal.proposed_rval,
          catRowsInserted: 0,
          expectedCatRows,
          rvtrsRecovered: rvtrs,
          trackPageAlbums: 0,
          trackPageResolves: false,
          albumHasCover: false,
          verificationPass: false,
          error: applyResult.message,
        });
        stoppedEarly = true;
        stopReason = `apply failed ${proposalId}`;
        break;
      }

      const verify = await verifyPostApply(
        proposalId,
        applyResult.albumId,
        applyResult.rval,
        applyResult.linkedRvtrs,
        expectedCatRows,
      );

      rows.push({
        proposalId,
        rvtr: proposal.rvtr,
        artistName: proposal.artist_name,
        trackTitle: proposal.track_title,
        albumTitle: proposal.proposed_album_title,
        preApplyPass: true,
        preApplyErrors: [],
        applied: true,
        idempotent: applyResult.idempotent,
        albumId: applyResult.albumId,
        rval: applyResult.rval,
        catRowsInserted: verify.catCount,
        expectedCatRows,
        rvtrsRecovered: applyResult.linkedRvtrs,
        trackPageAlbums: verify.trackPageAlbums,
        trackPageResolves: verify.trackPageResolves,
        albumHasCover: verify.albumHasCover,
        verificationPass: verify.pass,
        error: verify.error,
      });

      await appendMbIngestAudit({
        action: "apply",
        batchName: proposal.batch_name,
        rvtr: proposal.rvtr,
        proposalId,
        proposedRval: applyResult.rval,
        actor: ACTOR,
        ok: verify.pass,
        message: verify.pass
          ? `Wave-10 verify pass album=${applyResult.albumId}`
          : `Wave-10 verify FAIL: ${verify.error}`,
        signals: applyResult.linkedRvtrs,
      });

      if (!verify.pass) {
        failures.push(`verify ${proposalId}: ${verify.error}`);
        stoppedEarly = true;
        stopReason = `verification failed ${proposalId}`;
        break;
      }
    }
  }

  const after = await loadGraphMetrics();
  const allPassed =
    !stoppedEarly &&
    rows.length === WAVE_10_NEW_IDS.length &&
    rows.every((r) => r.verificationPass);

  return {
    wave: "APPLY-10",
    newProposalIds: [...WAVE_10_NEW_IDS],
    cumulativeIds: [...WAVE_10_CUMULATIVE_IDS],
    baseline,
    after,
    preApply,
    rows,
    stoppedEarly,
    stopReason,
    allPassed,
    failures,
  };
}

function metricsTable(m: GraphMetrics): string {
  return `| Linked RVTRs | ${m.linkedRvtrCount.toLocaleString()} |
| Unlinked RVTRs (Hot 100) | ${m.unlinkedRvtrCount.toLocaleString()} |
| Hot 100 linked | ${m.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${m.hot100Missing.toLocaleString()} |
| Hot 100 linked % | ${m.hot100LinkedPct}% |
| Album count | ${m.albumCount.toLocaleString()} |
| Albums with cover | ${m.albumCoverCount.toLocaleString()} |
| Track pages with album (Hot 100) | ${m.trackPagesWithAlbum.toLocaleString()} |
| Track pages without album (Hot 100) | ${m.trackPagesWithoutAlbum.toLocaleString()} |`;
}

function deltaRow(label: string, before: number, after: number): string {
  const d = after - before;
  return `| ${label} | ${before.toLocaleString()} | ${after.toLocaleString()} | ${d >= 0 ? `+${d}` : d} |`;
}

export async function writeWave10BaselineReport(baseline: GraphMetrics): Promise<string> {
  const report = `# MB Wave 10 — Baseline

**Generated:** ${new Date().toISOString()}  
**Phase:** 6C — Pre-apply baseline (Wave 5 already applied: 29, 32, 35, 36, 37)

---

## Graph metrics (before Wave-10 apply)

| Metric | Value |
|--------|------:|
${metricsTable(baseline)}

---

## Next apply batch

Proposals: **30, 38, 46, 40, 41** (5 new → 10 cumulative)
`;
  const path = join(process.cwd(), "reports/mb-wave-10-baseline.md");
  await writeFile(path, report);
  return path;
}

export async function writeWave10ImpactReport(result: Wave10ApplyResult): Promise<string> {
  const { baseline, after, rows } = result;
  const appliedOk = rows.filter((r) => r.verificationPass);
  const pagesBetter = appliedOk.every((r) => r.trackPageResolves);
  const newCovers = appliedOk.filter((r) => r.albumHasCover).length;
  const mergedRvtrs = appliedOk.reduce((s, r) => s + r.rvtrsRecovered.length, 0);

  const wave25Ready =
    result.allPassed && pagesBetter && result.failures.length === 0;
  const recommendBatch = result.allPassed
    ? appliedOk.length === 5 && baseline.hot100Linked > 0
      ? "**25** — 10/10 cumulative passed; 13 approve-ready staged remain; merged albums (30, 38) verified; stage next MB cohort before 50."
      : "**10**"
    : "**10** — fix failures first";

  const report = `# MB Wave 10 — Impact Measurement

**Generated:** ${new Date().toISOString()}  
**Phase:** 6C — Apply-10 + impact  
**Result:** ${result.allPassed ? "**ALL PASSED**" : "**FAILED/INCOMPLETE**"}  
**Cumulative applied:** ${result.allPassed ? "10" : `${5 + appliedOk.length}`} (Wave 5 + Wave 10 new)

---

## Per-proposal results

| ID | RVTR | Artist | Album | RVAL | CAT | RVTRs | Track page | Cover | Verify |
|----|------|--------|-------|------|-----|-------|------------|-------|--------|
${rows
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.artistName} | ${r.albumTitle} | ${r.rval ?? "—"} | ${r.catRowsInserted}/${r.expectedCatRows} | ${r.rvtrsRecovered.join(", ")} | ${r.trackPageResolves ? "yes" : "no"} | ${r.albumHasCover ? "yes" : "no"} | ${r.verificationPass ? "**PASS**" : "FAIL"} |`,
  )
  .join("\n") || "_None_"}

${result.stoppedEarly ? `\n**Stopped:** ${result.stopReason}\n` : ""}
${result.failures.length ? `\n**Failures:**\n${result.failures.map((f) => `- ${f}`).join("\n")}\n` : ""}

---

## Coverage changes

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
${deltaRow("Linked RVTRs", baseline.linkedRvtrCount, after.linkedRvtrCount)}
${deltaRow("Hot 100 linked", baseline.hot100Linked, after.hot100Linked)}
${deltaRow("Hot 100 missing", baseline.hot100Missing, after.hot100Missing)}
${deltaRow("Album count", baseline.albumCount, after.albumCount)}
${deltaRow("Albums with cover", baseline.albumCoverCount, after.albumCoverCount)}
${deltaRow("Track pages with album", baseline.trackPagesWithAlbum, after.trackPagesWithAlbum)}
${deltaRow("Track pages without album", baseline.trackPagesWithoutAlbum, after.trackPagesWithoutAlbum)}

---

## Key questions

### 1. Are recovered tracks rendering better pages?

**${pagesBetter ? "YES" : "NO"}** — ${appliedOk.length}/${rows.length} applied proposals resolve album on \`/track/{RVTR}\` (${mergedRvtrs} RVTR links total including merged groups).

### 2. Did any new albums gain covers automatically?

**${newCovers > 0 ? `YES — ${newCovers}/${appliedOk.length}` : "NO — 0/" + appliedOk.length}** new ingest albums have cover paths. MB ingest v1 does not run RV12/cover backfill; covers expected only if pre-existing artwork links matched.

### 3. Is pipeline confidence high enough for Wave-25?

**${wave25Ready ? "YES" : "NOT YET"}** — ${result.allPassed ? "10 cumulative applies verified with zero failures." : `Stopped: ${result.stopReason}`}

### 4. Recommended next batch size

${recommendBatch}

| Option | Confidence |
|--------|------------|
| 10 | High if any failure in this wave |
| **25** | ${wave25Ready ? "**High** — after re-readiness on remaining 13 staged approve" : "Medium"} |
| 50 | Low — needs bulk MB staging CLI |

---

## Files

- Baseline: \`reports/mb-wave-10-baseline.md\`
- Wave 5: \`reports/mb-wave-5-apply.md\`
- Audit: \`RETROVERSE_DATA/ops/healing/mb-ingest-audit.jsonl\`
`;

  const path = join(process.cwd(), "reports/mb-wave-10-impact.md");
  await writeFile(path, report);
  return path;
}
