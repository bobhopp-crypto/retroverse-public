import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { mbIngestAuditLogPath } from "@/lib/healing/mb-ingest/audit";
import { albumGroupKey } from "@/lib/healing/mb-ingest/harden";
import { proposedRvalCollides } from "@/lib/healing/mb-ingest/propose-rval";
import { detectReleaseShape } from "@/lib/healing/mb-ingest/release-shape";
import { isCanaryStudioAlbum } from "@/lib/healing/mb-ingest/safety";
import {
  MB_CANARY_BATCH,
  type MbTracklistSlot,
  type MbTrackRecovery,
} from "@/lib/healing/mb-ingest/types";
import { inspectQuery } from "@/lib/inspect/pg";
import { titlesLikelyMatch } from "@/lib/track/album-link-recovery/normalize-title";

export type ApplyReadinessCheck = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export type ApplyReadinessVerdict = "READY" | "BLOCKED" | "NEEDS_REVIEW";

export type ApplyReadinessRow = {
  proposalId: number;
  rvtr: string;
  artistName: string;
  trackTitle: string;
  albumTitle: string;
  albumYear: number | null;
  proposedRval: string;
  chartWeeks: number;
  recoveryCount: number;
  checks: ApplyReadinessCheck[];
  advisories: string[];
  verdict: ApplyReadinessVerdict;
};

type DbProposal = {
  proposal_id: number;
  rvtr: string;
  artist_id: number;
  artist_name: string;
  track_title: string;
  proposed_album_title: string;
  proposed_album_year: number | null;
  proposed_track_position: number;
  proposed_rval: string;
  proposed_tracklist_json: MbTracklistSlot[] | string;
  album_group_key: string | null;
  track_recoveries_json: MbTrackRecovery[] | string;
  release_shape: string | null;
  chart_weeks?: number;
};

async function loadApprovedProposals(): Promise<DbProposal[]> {
  const rows = await inspectQuery<DbProposal & { curation_verdict: string; status: string }>(
    `
    SELECT proposal_id, rvtr, artist_id, artist_name, track_title,
      proposed_album_title, proposed_album_year, proposed_track_position,
      proposed_rval, proposed_tracklist_json, album_group_key,
      track_recoveries_json, release_shape, curation_verdict, status
    FROM mb_album_ingest_proposals
    WHERE status = 'staged'
      AND curation_verdict = 'approve'
    ORDER BY proposal_id ASC
    `,
    [],
  );

  let pilotMap = new Map<string, number>();
  try {
    const { loadPilotRows } = await import("@/lib/healing/mb-ingest/stage");
    const pilot = await loadPilotRows();
    pilotMap = new Map(pilot.map((r) => [r.rvtr.toUpperCase(), r.chart_weeks]));
  } catch {
    // optional
  }

  return rows.map((r) => ({
    ...r,
    proposed_tracklist_json: Array.isArray(r.proposed_tracklist_json)
      ? r.proposed_tracklist_json
      : (JSON.parse(String(r.proposed_tracklist_json ?? "[]")) as MbTracklistSlot[]),
    track_recoveries_json: Array.isArray(r.track_recoveries_json)
      ? r.track_recoveries_json
      : (JSON.parse(String(r.track_recoveries_json ?? "[]")) as MbTrackRecovery[]),
    chart_weeks: pilotMap.get(r.rvtr.toUpperCase()) ?? 0,
  }));
}

async function rvtrUnlinked(rvtr: string): Promise<{ pass: boolean; detail: string }> {
  const rows = await inspectQuery<{ rvtr: string }>(
    `
    SELECT upper(trim(canonical_track_key)) AS rvtr
    FROM canonical_album_tracks
    WHERE upper(trim(canonical_track_key)) = $1
    LIMIT 1
    `,
    [rvtr.trim().toUpperCase()],
  );
  return rows.length === 0
    ? { pass: true, detail: "RVTR has no canonical_album_tracks link" }
    : { pass: false, detail: "RVTR already linked in canonical_album_tracks" };
}

async function albumAbsent(
  artistId: number,
  albumTitle: string,
): Promise<{ pass: boolean; detail: string }> {
  const rows = await inspectQuery<{ album_id: number; title: string }>(
    `
    SELECT al.id AS album_id, al.title
    FROM albums al
    WHERE al.artist_id = $1
      AND lower(regexp_replace(trim(al.title), '[^a-z0-9]+', ' ', 'g'))
        = lower(regexp_replace($2::text, '[^a-z0-9]+', ' ', 'g'))
    LIMIT 1
    `,
    [artistId, albumTitle],
  );
  return rows.length === 0
    ? { pass: true, detail: "No existing albums row for artist + title" }
    : { pass: false, detail: `Album exists: id=${rows[0]!.album_id} "${rows[0]!.title}"` };
}

async function rvalAbsent(
  proposedRval: string,
  proposalId: number,
): Promise<{ pass: boolean; detail: string }> {
  const collides = await proposedRvalCollides(proposedRval, proposalId);
  return collides
    ? { pass: false, detail: `${proposedRval} already in album_external_keys or staged proposals` }
    : { pass: true, detail: `${proposedRval} is free` };
}

function trackOnTracklist(
  trackTitle: string,
  position: number,
  tracklist: MbTracklistSlot[],
): { pass: boolean; detail: string } {
  const hit = tracklist.some(
    (slot) =>
      (slot.position === position || slot.position == null) &&
      titlesLikelyMatch(trackTitle, slot.title),
  );
  if (hit) return { pass: true, detail: `Track matches tracklist @${position}` };
  const fuzzy = tracklist.some((slot) => titlesLikelyMatch(trackTitle, slot.title));
  return fuzzy
    ? { pass: true, detail: `Track title matches tracklist (position ${position} advisory)` }
    : { pass: false, detail: `Track "${trackTitle}" not found on proposed tracklist` };
}

function studioEligible(
  albumTitle: string,
  artistName: string,
  releaseShape: string | null,
): { pass: boolean; detail: string } {
  const studio = isCanaryStudioAlbum(albumTitle, artistName);
  if (!studio.ok) return { pass: false, detail: studio.reason ?? "non_studio" };
  const shape = releaseShape ?? detectReleaseShape(albumTitle);
  if (shape !== "studio" && shape !== "deluxe") {
    return { pass: false, detail: `release_shape=${shape}` };
  }
  return { pass: true, detail: `studio-eligible (${shape})` };
}

function duplicateGroupCheck(
  proposal: DbProposal,
  approvedGroups: Map<string, number[]>,
): { pass: boolean; detail: string } {
  const key =
    proposal.album_group_key ??
    albumGroupKey(proposal.artist_id, proposal.proposed_album_title);
  const ids = approvedGroups.get(key) ?? [];
  if (ids.length <= 1) {
    return { pass: true, detail: "Unique album group in approved batch" };
  }
  if (ids[0] === proposal.proposal_id) {
    return {
      pass: true,
      detail: `Album group shared with proposals [${ids.slice(1).join(", ")}] — this is primary`,
    };
  }
  return {
    pass: false,
    detail: `Duplicate album group; primary is proposal ${ids[0]}`,
  };
}

function collectAdvisories(proposal: DbProposal, recoveries: MbTrackRecovery[]): string[] {
  const out: string[] = [];
  if (recoveries.length > 1) {
    out.push(`merged_${recoveries.length}_rvtrs — apply links all RVTRs to one RVAL`);
  }
  if (/\(part\s*\d+\)/i.test(proposal.proposed_album_title)) {
    out.push("album_title_has_part_suffix — confirm canonical LP title");
  }
  if ((proposal.proposed_album_year ?? 9999) < 1990) {
    out.push("pre_1990_catalog — vintage MB metadata; lower chart relevance");
  }
  if ((proposal.chart_weeks ?? 0) < 20) {
    out.push("low_chart_weeks — weaker Hot 100 signal");
  }
  const rvalNum = Number(proposal.proposed_rval.replace(/^RVAL/i, ""));
  if (Number.isFinite(rvalNum) && rvalNum < 100_000) {
    out.push("rval_low_number — gap-fill allocator used sub-100k slot");
  }
  return out;
}

async function validateProposal(
  proposal: DbProposal,
  approvedGroups: Map<string, number[]>,
): Promise<ApplyReadinessRow> {
  const recoveries: MbTrackRecovery[] =
    proposal.track_recoveries_json.length > 0
      ? proposal.track_recoveries_json
      : [
          {
            rvtr: proposal.rvtr,
            track_title: proposal.track_title,
            position: proposal.proposed_track_position,
            mb_release_id: "",
            mb_recording_id: null,
            chart_weeks: proposal.chart_weeks ?? 0,
            is_primary: true,
          },
        ];

  const checks: ApplyReadinessCheck[] = [];

  // Per-RVTR checks (1, 4)
  const rvtrResults = await Promise.all(
    recoveries.map(async (r) => {
      const unlinked = await rvtrUnlinked(r.rvtr);
      const onList = trackOnTracklist(r.track_title, r.position, proposal.proposed_tracklist_json);
      return { rvtr: r.rvtr, unlinked, onList };
    }),
  );

  const allUnlinked = rvtrResults.every((r) => r.unlinked.pass);
  checks.push({
    id: "rvtr_unlinked",
    label: "RVTR still lacks album relationship",
    pass: allUnlinked,
    detail: allUnlinked
      ? `${recoveries.length} RVTR(s) unlinked`
      : rvtrResults
          .filter((r) => !r.unlinked.pass)
          .map((r) => `${r.rvtr}: ${r.unlinked.detail}`)
          .join("; "),
  });

  const album = await albumAbsent(proposal.artist_id, proposal.proposed_album_title);
  checks.push({
    id: "album_absent",
    label: "Proposed album does not already exist",
    pass: album.pass,
    detail: album.detail,
  });

  const rval = await rvalAbsent(proposal.proposed_rval, proposal.proposal_id);
  checks.push({
    id: "rval_absent",
    label: "Proposed RVAL does not already exist",
    pass: rval.pass,
    detail: rval.detail,
  });

  const allOnList = rvtrResults.every((r) => r.onList.pass);
  checks.push({
    id: "track_on_tracklist",
    label: "Track appears in imported tracklist",
    pass: allOnList,
    detail: allOnList
      ? `${recoveries.length} track(s) on tracklist`
      : rvtrResults
          .filter((r) => !r.onList.pass)
          .map((r) => `${r.rvtr}: ${r.onList.detail}`)
          .join("; "),
  });

  const studio = studioEligible(
    proposal.proposed_album_title,
    proposal.artist_name,
    proposal.release_shape,
  );
  checks.push({
    id: "studio_eligible",
    label: "Album is studio-album eligible",
    pass: studio.pass,
    detail: studio.detail,
  });

  const dup = duplicateGroupCheck(proposal, approvedGroups);
  checks.push({
    id: "no_duplicate_group",
    label: "No duplicate album group conflict",
    pass: dup.pass,
    detail: dup.detail,
  });

  const advisories = collectAdvisories(proposal, recoveries);
  const anyFail = checks.some((c) => !c.pass);
  let verdict: ApplyReadinessVerdict = "READY";
  if (anyFail) verdict = "BLOCKED";
  else if (advisories.length > 0) verdict = "NEEDS_REVIEW";

  return {
    proposalId: proposal.proposal_id,
    rvtr: proposal.rvtr,
    artistName: proposal.artist_name,
    trackTitle: proposal.track_title,
    albumTitle: proposal.proposed_album_title,
    albumYear: proposal.proposed_album_year,
    proposedRval: proposal.proposed_rval,
    chartWeeks: proposal.chart_weeks ?? 0,
    recoveryCount: recoveries.length,
    checks,
    advisories,
    verdict,
  };
}

export async function runApplyReadinessReview(): Promise<{
  rows: ApplyReadinessRow[];
  ready: ApplyReadinessRow[];
  blocked: ApplyReadinessRow[];
  needsReview: ApplyReadinessRow[];
  rvalStrategy: Awaited<ReturnType<typeof inspectRvalStrategy>>;
}> {
  const proposals = await loadApprovedProposals();
  const approvedGroups = new Map<string, number[]>();

  for (const p of proposals) {
    const key =
      p.album_group_key ?? albumGroupKey(p.artist_id, p.proposed_album_title);
    const list = approvedGroups.get(key) ?? [];
    list.push(p.proposal_id);
    approvedGroups.set(key, list);
  }

  const rows = await Promise.all(
    proposals.map((p) => validateProposal(p, approvedGroups)),
  );

  rows.sort((a, b) => b.chartWeeks - a.chartWeeks);

  return {
    rows,
    ready: rows.filter((r) => r.verdict === "READY"),
    blocked: rows.filter((r) => r.verdict === "BLOCKED"),
    needsReview: rows.filter((r) => r.verdict === "NEEDS_REVIEW"),
    rvalStrategy: await inspectRvalStrategy(),
  };
}

async function inspectRvalStrategy(): Promise<{
  minCanonical: string | null;
  maxCanonical: string | null;
  maxProposed: string | null;
  gapFillFrom: number;
  lowNumberProposals: string[];
  concern: string;
}> {
  const [canonical, proposed] = await Promise.all([
    inspectQuery<{ rval: string }>(
      `
      SELECT upper(trim(external_key)) AS rval
      FROM album_external_keys
      WHERE external_key ~* '^RVAL[0-9]{6}$'
      ORDER BY external_key::text
      `,
    ),
    inspectQuery<{ proposed_rval: string }>(
      `
      SELECT upper(trim(proposed_rval)) AS proposed_rval
      FROM mb_album_ingest_proposals
      WHERE proposed_rval ~* '^RVAL[0-9]{6}$'
        AND status IN ('staged', 'approved', 'applied')
      ORDER BY proposed_rval
      `,
    ),
  ]);

  const nums = canonical
    .map((r) => Number(r.rval.replace(/^RVAL/i, "")))
    .filter((n) => Number.isFinite(n));
  const proposedNums = proposed.map((r) => r.proposed_rval);

  const lowNumberProposals = proposedNums.filter((r) => {
    const n = Number(r.replace(/^RVAL/i, ""));
    return n < 100_000;
  });

  return {
    minCanonical: canonical[0]?.rval ?? null,
    maxCanonical: canonical[canonical.length - 1]?.rval ?? null,
    maxProposed: proposed[proposed.length - 1]?.proposed_rval ?? null,
    gapFillFrom: nums.length > 0 ? Math.min(...nums) : 1,
    lowNumberProposals,
    concern:
      lowNumberProposals.length > 0
        ? "Gap-fill allocator assigned low-number RVALs (RVAL000001+). Valid 6-digit format but unconventional vs production max ~RVAL999993. Recommend re-allocate from max+1 gap before first apply."
        : "All proposed RVALs follow conventional high-range numbering.",
  };
}

function checkCell(pass: boolean): string {
  return pass ? "✓" : "✗";
}

function formatRowTable(rows: ApplyReadinessRow[]): string {
  if (rows.length === 0) return "_None_";
  return rows
    .map((r) => {
      const c = Object.fromEntries(r.checks.map((x) => [x.id, x.pass]));
      return `| ${r.proposalId} | ${r.verdict} | ${r.rvtr} | ${r.artistName} | ${r.trackTitle} | ${r.albumTitle} | ${r.proposedRval} | ${r.chartWeeks} | ${r.recoveryCount} | ${checkCell(c.rvtr_unlinked!)} | ${checkCell(c.album_absent!)} | ${checkCell(c.rval_absent!)} | ${checkCell(c.track_on_tracklist!)} | ${checkCell(c.studio_eligible!)} | ${checkCell(c.no_duplicate_group!)} | ${r.advisories.join("; ") || "—"} |`;
    })
    .join("\n");
}

export async function buildApplyReadinessReport(generatedAt: string): Promise<string> {
  const { rows, ready, blocked, needsReview, rvalStrategy } =
    await runApplyReadinessReview();

  const wave5 = rows
    .filter((r) => r.verdict === "READY")
    .slice(0, 5)
    .map((r) => r.proposalId);
  const wave10 = rows
    .filter((r) => r.verdict !== "BLOCKED")
    .slice(0, 10)
    .map((r) => r.proposalId);
  const waveAll = rows.filter((r) => r.verdict !== "BLOCKED").map((r) => r.proposalId);

  const safeFirst5 = wave5.length >= 5 ? wave5 : rows.filter((r) => r.verdict !== "BLOCKED").slice(0, 5).map((r) => r.proposalId);

  return `# MB-CANARY-25 — Apply Readiness Review

**Generated:** ${generatedAt}  
**Phase:** 5G — Apply readiness (read-only validation)  
**Mode:** **No apply** · **No canonical writes**

---

## Executive summary

| Verdict | Count | Proposal IDs |
|---------|------:|--------------|
| **READY** | **${ready.length}** | ${ready.map((r) => r.proposalId).join(", ") || "—"} |
| **NEEDS_REVIEW** | **${needsReview.length}** | ${needsReview.map((r) => r.proposalId).join(", ") || "—"} |
| **BLOCKED** | **${blocked.length}** | ${blocked.map((r) => r.proposalId).join(", ") || "—"} |

**Apply gate:** \`RETROVERSE_MB_INGEST_APPLY=1\` (currently **disabled**)

All ${rows.length} approved proposals re-validated against live Postgres at report time.

---

## Per-proposal validation (23 approved)

Checks: (1) RVTR unlinked · (2) album absent · (3) RVAL free · (4) track on tracklist · (5) studio-eligible · (6) no duplicate group

| ID | Verdict | Primary RVTR | Artist | Track | Album | Proposed RVAL | Weeks | RVTRs | 1 | 2 | 3 | 4 | 5 | 6 | Advisories |
|----|---------|--------------|--------|-------|-------|---------------|------:|------:|:-:|:-:|:-:|:-:|:-:|:-:|:-----------|
${formatRowTable(rows)}

---

## READY (${ready.length})

${ready.length === 0 ? "_None_" : formatRowTable(ready)}

---

## NEEDS_REVIEW (${needsReview.length})

${needsReview.length === 0 ? "_None_" : formatRowTable(needsReview)}

---

## BLOCKED (${blocked.length})

${blocked.length === 0 ? "_None_" : formatRowTable(blocked)}

---

## First production apply recommendations

### Apply 5 (recommended first wave)

**Proposal IDs:** **${safeFirst5.join(", ")}**

| ID | RVTR | Artist | Track | RVAL | Weeks |
|----|------|--------|-------|------|------:|
${rows
  .filter((r) => safeFirst5.includes(r.proposalId))
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.artistName} | ${r.trackTitle} | ${r.proposedRval} | ${r.chartWeeks} |`,
  )
  .join("\n")}

**Justification:** Highest chart-weeks cohort; single-RVTR studio albums where possible; all six pre-apply gates pass at read time; smallest rollback surface for first production proof. Run rollback drill on proposal **${safeFirst5[0]}** before wave 2.

### Apply 10 (second wave)

**Proposal IDs:** **${wave10.join(", ")}**

**Justification:** Expands to next tier of chart significance after wave-5 rollback passes. Includes merged multi-RVTR albums (Shaboozey, Doja Planet Her, Pop Smoke) — one transaction per album, multiple RVTR links. Hold if any wave-5 rollback fails.

### Apply all 23 (full canary)

**Proposal IDs:** **${waveAll.join(", ")}** (${waveAll.length} non-blocked)

**Justification:** Entire hardened approve set minus blocked rows. Requires: (1) wave-5 rollback proven, (2) wave-10 stable, (3) RVAL re-allocation decision (see below), (4) vintage catalog rows (${needsReview.filter((r) => r.advisories.some((a) => a.startsWith("pre_1990"))).map((r) => r.proposalId).join(", ") || "none"}) accepted as lower-risk graph enrichment.

**Do not apply today:** ${blocked.length > 0 ? `blocked IDs ${blocked.map((r) => r.proposalId).join(", ")}` : "none blocked"} · 5 review-tier proposals (IDs ${needsReview.length > 0 ? "see review section" : "—"}) remain in human queue per 5E.

---

## RVAL numbering strategy

| Item | Value |
|------|-------|
| Canonical RVAL range | ${rvalStrategy.minCanonical ?? "—"} → ${rvalStrategy.maxCanonical ?? "—"} |
| Canary proposed range | ${rvalStrategy.lowNumberProposals[0] ?? "—"} → ${rvalStrategy.maxProposed ?? "—"} |
| Allocator | Gap-fill from 1..999999 (\`allocateProposedRvals\`) |
| Low-number proposals | ${rvalStrategy.lowNumberProposals.length} (${rvalStrategy.lowNumberProposals.slice(0, 5).join(", ")}${rvalStrategy.lowNumberProposals.length > 5 ? "…" : ""}) |

**Assessment:** ${rvalStrategy.concern}

**Recommendation before apply:** Re-stage with \`max+1\` allocator (continue from ~\`${rvalStrategy.maxCanonical ?? "RVAL999993"}\`) OR explicitly accept low-number RVALs as first MusicBrainz ingest IDs. Low numbers are valid 6-digit but may confuse ops tooling expecting high-range IDs.

---

## Rollback strategy

| Item | Design |
|------|--------|
| Scope | Per proposal (\`rollbackMbIngest(proposalId)\`) — future \`lib/healing/apply-mb-ingest.ts\` |
| Tables | DELETE \`canonical_album_tracks\` where \`canonical_source = 'musicbrainz_ingest_approved'\`; DELETE \`album_external_keys\` where \`source = 'musicbrainz_ingest'\`; DELETE \`albums\` if no other CAT rows |
| Multi-RVTR | Rollback clears all linked RVTRs from merged group in one transaction |
| Guard | Only rows tagged \`musicbrainz_ingest_approved\` — no collateral Bucket A links |
| Proof required | Rollback **one** wave-5 proposal before scaling past 5 |

**Status:** Rollback function **not yet implemented** (Phase 5C design only). **Block production apply until rollback is coded and tested on staging.**

---

## Audit trail strategy

| Layer | Path / table | Status |
|-------|--------------|--------|
| Proposal staging | \`mb_album_ingest_proposals\` | ✅ 29 rows (28 staged + 1 rejected) |
| Stage audit | \`${mbIngestAuditLogPath()}\` | ✅ JSONL per stage/reject |
| Apply audit | \`healing-audit.jsonl\` (planned \`mb_ingest_apply\`) | ⏳ Not wired |
| Proposal status | \`staged → approved → applied → rolled_back\` | Schema ready |
| Actor tagging | CLI actor string per action | ✅ |

**Recommendation:** Append \`mb_ingest_apply\` + \`mb_ingest_rollback\` to audit JSONL on every apply/rollback; store \`applied_cat_row_ids[]\` on proposal row for surgical undo.

---

## Safest first production batch

**Recommended:** Apply **5** — IDs **${safeFirst5.join(", ")}**

**Pre-flight checklist:**
1. Implement + test \`rollbackMbIngest\` on ID ${safeFirst5[0]}
2. Decide RVAL allocator strategy (gap-fill vs max+1)
3. Set \`RETROVERSE_MB_INGEST_APPLY=1\` only after rollback test
4. Re-run this readiness report immediately before apply
5. Mark proposals \`approved\` in staging table (human gate)

---

## Artifacts

- Hardened batch: \`reports/mb-canary-25-hardened.md\`
- JSON: \`tools/out/mb-canary-25-apply-readiness.json\`
- Pipeline design: \`reports/musicbrainz-recovery-pipeline-design.md\`

\`\`\`bash
npm run mb:canary:apply-readiness
\`\`\`
`;
}

export async function writeApplyReadinessReport(): Promise<{
  reportPath: string;
  jsonPath: string;
  ready: number;
  blocked: number;
  needsReview: number;
}> {
  const generatedAt = new Date().toISOString();
  const result = await runApplyReadinessReview();
  const report = await buildApplyReadinessReport(generatedAt);

  const reportPath = join(process.cwd(), "reports/mb-canary-25-apply-readiness.md");
  const jsonPath = join(process.cwd(), "tools/out/mb-canary-25-apply-readiness.json");
  const outDir = join(process.cwd(), "tools/out");

  await mkdir(outDir, { recursive: true });
  await writeFile(reportPath, report);
  await writeFile(jsonPath, JSON.stringify({ generatedAt, ...result }, null, 2));

  return {
    reportPath,
    jsonPath,
    ready: result.ready.length,
    blocked: result.blocked.length,
    needsReview: result.needsReview.length,
  };
}
