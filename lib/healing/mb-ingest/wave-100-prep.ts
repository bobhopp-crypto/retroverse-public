import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runApplyReadinessReview } from "@/lib/healing/mb-ingest/apply-readiness";
import { allocateProposedRvals } from "@/lib/healing/mb-ingest/propose-rval";
import { stageMbWave25Incremental } from "@/lib/healing/mb-ingest/stage";
import { WAVE_100_TARGET } from "@/lib/healing/mb-ingest/types";
import { loadGraphMetrics } from "@/lib/healing/mb-ingest/wave-10-apply";
import { resolveNextReadyProposalIds } from "@/lib/healing/mb-ingest/wave-25-apply";
import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

const MIN_READY = 120;
const SEC_PER_ALBUM = 26.4;

export type Wave100PrepResult = {
  generatedAt: string;
  ready: number;
  blocked: number;
  needsReview: number;
  curationReview: number;
  stagingRounds: number;
  pilotTarget: number;
  blockedResolved: string[];
  stopOnFirstFailure: boolean;
  estimatedRuntimeMinutes: number;
  expectedGraphImpact: {
    albums: number;
    rvtrLinks: number;
    hot100Gain: number;
    linkedPctAfter: number;
  };
  topReadyIds: number[];
  executeCommand: string;
};

async function loadAppliedIds(): Promise<Set<number>> {
  const rows = await inspectQuery<{ proposal_id: number }>(
    `SELECT proposal_id FROM mb_album_ingest_proposals WHERE status = 'applied'`,
  );
  return new Set(rows.map((r) => Number(r.proposal_id)));
}

async function loadCurationReviewCount(): Promise<number> {
  const rows = await inspectQuery<{ c: number }>(
    `SELECT count(*)::int AS c FROM mb_album_ingest_proposals WHERE status='staged' AND curation_verdict='review'`,
  );
  return rows[0]?.c ?? 0;
}

/** Reject stale staged rows that can never apply cleanly. */
async function resolveBlockedWherePossible(
  blocked: Awaited<ReturnType<typeof runApplyReadinessReview>>["blocked"],
): Promise<string[]> {
  const resolved: string[] = [];

  for (const row of blocked) {
    const fails = row.checks.filter((c) => !c.pass).map((c) => c.id);

    if (fails.includes("no_duplicate_group")) {
      await inspectExecute(
        `UPDATE mb_album_ingest_proposals SET status='rejected', reject_reason='duplicate_group_non_primary', updated_at=now() WHERE proposal_id=$1 AND status='staged'`,
        [row.proposalId],
      );
      resolved.push(`${row.proposalId}: rejected duplicate_group`);
      continue;
    }

    if (fails.includes("rvtr_unlinked")) {
      await inspectExecute(
        `UPDATE mb_album_ingest_proposals SET status='rejected', reject_reason='rvtr_already_linked', updated_at=now() WHERE proposal_id=$1 AND status='staged'`,
        [row.proposalId],
      );
      resolved.push(`${row.proposalId}: rejected rvtr_already_linked`);
      continue;
    }

    if (fails.includes("album_absent")) {
      await inspectExecute(
        `UPDATE mb_album_ingest_proposals SET status='rejected', reject_reason='album_already_exists', updated_at=now() WHERE proposal_id=$1 AND status='staged'`,
        [row.proposalId],
      );
      resolved.push(`${row.proposalId}: rejected album_exists`);
      continue;
    }

    if (fails.includes("rval_absent")) {
      // batched below
      continue;
    }
  }

  const rvalBlocked = blocked.filter((row) =>
    row.checks.filter((c) => !c.pass).map((c) => c.id).includes("rval_absent"),
  );
  if (rvalBlocked.length > 0) {
    const newRvals = await allocateProposedRvals(rvalBlocked.length);
    for (let i = 0; i < rvalBlocked.length; i += 1) {
      const row = rvalBlocked[i]!;
      const newRval = newRvals[i]!;
      await inspectExecute(
        `UPDATE mb_album_ingest_proposals SET proposed_rval=$2, updated_at=now() WHERE proposal_id=$1 AND status='staged'`,
        [row.proposalId, newRval],
      );
      resolved.push(`${row.proposalId}: reallocated ${newRval}`);
    }
  }

  return resolved;
}

export async function runWave100Prep(options?: {
  pilotTarget?: number;
  minReady?: number;
  runPilot?: boolean;
}): Promise<Wave100PrepResult> {
  const minReady = options?.minReady ?? MIN_READY;
  const pilotTarget = options?.pilotTarget ?? 400;
  let stagingRounds = 0;
  const blockedResolved: string[] = [];

  if (options?.runPilot !== false) {
    const { execSync } = await import("node:child_process");
    try {
      execSync("npx --yes tsx tools/healing/musicbrainz-ingest-pilot.ts", {
        cwd: process.cwd(),
        stdio: "inherit",
        env: { ...process.env, MB_PILOT_TARGET: String(pilotTarget) },
      });
    } catch (err) {
      console.warn("[wave-100-prep] pilot expansion failed; continuing with existing pilot JSON");
    }
  }

  let readyCount = 0;
  for (let round = 0; round < 20 && readyCount < minReady; round += 1) {
    const stage = await stageMbWave25Incremental("mb-wave-100-prep");
    stagingRounds += 1;
    if (stage.staged === 0) break;

    let readiness = await runApplyReadinessReview();
    const fixes = await resolveBlockedWherePossible(readiness.blocked);
    blockedResolved.push(...fixes);
    if (fixes.length > 0) readiness = await runApplyReadinessReview();

    const applied = await loadAppliedIds();
    readyCount = readiness.ready.filter((r) => !applied.has(r.proposalId)).length;
    if (stage.staged === 0 && fixes.length === 0) break;
  }

  const readiness = await runApplyReadinessReview();
  const applied = await loadAppliedIds();
  const unappliedReady = readiness.ready.filter((r) => !applied.has(r.proposalId));
  const metrics = await loadGraphMetrics();
  const curationReview = await loadCurationReviewCount();

  const rvtrLinks = Math.round(WAVE_100_TARGET * 1.12);
  const hot100After = metrics.hot100Linked + rvtrLinks;
  const hot100Pct =
    metrics.hot100Total > 0
      ? Math.round((hot100After / metrics.hot100Total) * 1000) / 10
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    ready: unappliedReady.length,
    blocked: readiness.blocked.length,
    needsReview: readiness.needsReview.length,
    curationReview,
    stagingRounds,
    pilotTarget,
    blockedResolved,
    stopOnFirstFailure: true,
    estimatedRuntimeMinutes: Math.round((WAVE_100_TARGET * SEC_PER_ALBUM) / 60),
    expectedGraphImpact: {
      albums: WAVE_100_TARGET,
      rvtrLinks,
      hot100Gain: rvtrLinks,
      linkedPctAfter: hot100Pct,
    },
    topReadyIds: unappliedReady
      .sort((a, b) => b.chartWeeks - a.chartWeeks)
      .slice(0, WAVE_100_TARGET)
      .map((r) => r.proposalId),
    executeCommand:
      "RETROVERSE_MB_INGEST_APPLY=1 RETROVERSE_MB_COVER_APPLY=1 npm run mb:wave-100:apply",
  };
}

export async function writeWave100PrepReport(result: Wave100PrepResult): Promise<string> {
  const readiness = await runApplyReadinessReview();
  const report = `# MB Wave 100 — Preparation Report

**Generated:** ${result.generatedAt}  
**Mode:** Prepare only — **no apply executed**  
**Target READY queue:** ≥${MIN_READY} (for Wave ${WAVE_100_TARGET} apply)

---

## Queue status

| Verdict | Count |
|---------|------:|
| **READY** (unapplied) | **${result.ready}** |
| **BLOCKED** | **${result.blocked}** |
| **NEEDS_REVIEW** (approve + advisories) | **${result.needsReview}** |
| Curation review (staged) | ${result.curationReview} |

**Staging rounds:** ${result.stagingRounds} · **Pilot target:** ${result.pilotTarget}

### BLOCKED resolved this prep

${result.blockedResolved.length ? result.blockedResolved.map((l) => `- ${l}`).join("\n") : "_none_"}

### Remaining BLOCKED

${readiness.blocked.length ? readiness.blocked.map((r) => `- **${r.proposalId}** ${r.rvtr} — ${r.checks.filter((c) => !c.pass).map((c) => c.id).join(", ")}`).join("\n") : "_none_"}

---

## NEEDS_REVIEW summary

### Curation-held (staged \`review\` verdict) — ${result.curationReview}

${(await inspectQuery<{ proposal_id: number; rvtr: string; artist_name: string; proposed_album_title: string; reject_reason: string | null }>(
  `SELECT proposal_id, rvtr, artist_name, proposed_album_title, reject_reason FROM mb_album_ingest_proposals WHERE status='staged' AND curation_verdict='review' ORDER BY proposal_id LIMIT 20`,
)).map((r) => `- **${r.proposal_id}** ${r.rvtr} — ${r.artist_name} / ${r.proposed_album_title}`).join("\n") || "_none_"}

### Approve-ready with advisories (excluded from READY) — ${result.needsReview}

${readiness.needsReview.slice(0, 15).map((r) => `- **${r.proposalId}** ${r.rvtr} — ${r.advisories.join("; ")}`).join("\n") || "_none_"}

---

## Stop-on-first-failure

**Enabled:** ${result.stopOnFirstFailure ? "**YES**" : "NO"} — \`wave-25-apply.ts\` breaks on pre-apply, apply, or verify failure (\`stoppedEarly = true\`). No batch override flag exists.

---

## Estimated runtime (Wave 100 apply + integrated covers)

| Metric | Estimate |
|--------|----------|
| Core apply+cover | **~${result.estimatedRuntimeMinutes} min** |
| Per album (observed Wave 50) | ~${SEC_PER_ALBUM}s |

---

## Expected graph impact (Wave 100)

| Metric | Projected |
|--------|----------|
| Albums | **+${result.expectedGraphImpact.albums}** |
| RVTR links | **+${result.expectedGraphImpact.rvtrLinks}** |
| Hot 100 gain | **+${result.expectedGraphImpact.hot100Gain}** |
| Hot 100 linked % after | **${result.expectedGraphImpact.linkedPctAfter}%** |

---

## Wave 100 execute command (NOT run in this phase)

\`\`\`bash
${result.executeCommand}
\`\`\`

**Pre-flight:** READY ≥ ${WAVE_100_TARGET}, BLOCKED = 0 on target IDs, \`npm run mb:canary:apply-readiness\`

**Top ${WAVE_100_TARGET} READY IDs (preview):** ${result.topReadyIds.join(", ") || "—"}
`;

  const path = join(process.cwd(), "reports/mb-wave-100-prep.md");
  await writeFile(path, report);
  await writeFile(join(process.cwd(), "tools/out/mb-wave-100-prep.json"), JSON.stringify(result, null, 2));
  return path;
}
