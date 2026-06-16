import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runApplyReadinessReview } from "@/lib/healing/mb-ingest/apply-readiness";
import { stageMbWave25Incremental } from "@/lib/healing/mb-ingest/stage";
import { WAVE_50_TARGET } from "@/lib/healing/mb-ingest/types";
import {
  loadGraphMetrics,
  resolveNextReadyProposalIds,
  runMbWaveApply,
  type Wave25ApplyResult,
} from "@/lib/healing/mb-ingest/wave-25-apply";
import { WAVE_25_CUMULATIVE_IDS } from "@/lib/healing/mb-ingest/wave-25-phase8b";
import { inspectQuery } from "@/lib/inspect/pg";

export type Wave50Classification = "PASS" | "PARTIAL" | "FAIL";

export type Wave50ApplyResult = Wave25ApplyResult & {
  readiness: {
    ready: number;
    needsReview: number;
    blocked: number;
    selected: number;
  };
  classification: Wave50Classification;
  coversAcquired: number;
  coversReviewHeld: number;
};

async function loadAppliedProposalIds(): Promise<Set<number>> {
  const rows = await inspectQuery<{ proposal_id: number }>(
    `SELECT proposal_id FROM mb_album_ingest_proposals WHERE status = 'applied'`,
  );
  return new Set(rows.map((r) => Number(r.proposal_id)));
}

export async function ensureWave50Queue(minReady = WAVE_50_TARGET): Promise<{
  ids: number[];
  staged: { approve: number; staged: number } | null;
}> {
  let ids = await resolveNextReadyProposalIds(minReady);
  let staged: { approve: number; staged: number } | null = null;

  for (let round = 0; ids.length < minReady && round < 4; round += 1) {
    const stageResult = await stageMbWave25Incremental("mb-wave-50-stage");
    staged = {
      approve: (staged?.approve ?? 0) + stageResult.approve,
      staged: (staged?.staged ?? 0) + stageResult.staged,
    };
    ids = await resolveNextReadyProposalIds(minReady);
    if (stageResult.staged === 0) break;
  }

  return { ids, staged };
}

export function classifyWave50(result: Wave25ApplyResult): Wave50Classification {
  if (result.stoppedEarly || result.rows.some((r) => !r.verificationPass)) {
    return "FAIL";
  }
  const ingestOk = result.impact.albumsAdded === result.proposalIds.length;
  const coversFailed = result.impact.coversFailed;
  const coversComplete = result.impact.coversComplete;
  if (ingestOk && coversFailed === 0 && coversComplete === result.proposalIds.length) {
    return "PASS";
  }
  if (ingestOk && coversComplete > 0) return "PARTIAL";
  return "FAIL";
}

export async function runWave50Apply(): Promise<Wave50ApplyResult> {
  const readiness = await runApplyReadinessReview();
  const applied = await loadAppliedProposalIds();
  const unappliedReady = readiness.ready.filter((r) => !applied.has(r.proposalId));

  await ensureWave50Queue(WAVE_50_TARGET);

  const base = await runMbWaveApply({
    target: WAVE_50_TARGET,
    wave: "APPLY-50",
    priorCumulativeIds: WAVE_25_CUMULATIVE_IDS,
    actor: "mb-wave-50-apply",
  });

  const coversReviewHeld = base.rows.filter((r) => r.coverOutcome === "review_held").length;
  const coversAcquired = base.rows.filter(
    (r) => r.coverOutcome === "acquired" || r.coverOutcome === "already_complete",
  ).length;

  return {
    ...base,
    readiness: {
      ready: readiness.ready.length,
      needsReview: readiness.needsReview.length,
      blocked: readiness.blocked.length,
      selected: base.proposalIds.length,
    },
    classification: classifyWave50(base),
    coversAcquired,
    coversReviewHeld,
  };
}

function metricsTable(m: Awaited<ReturnType<typeof loadGraphMetrics>>): string {
  return `| Linked RVTRs | ${m.linkedRvtrCount.toLocaleString()} |
| Hot 100 linked | ${m.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${m.hot100Missing.toLocaleString()} |
| Hot 100 linked % | ${m.hot100LinkedPct}% |
| Album count | ${m.albumCount.toLocaleString()} |`;
}

export async function writeWave50ImpactReport(result: Wave50ApplyResult): Promise<string> {
  const passed = result.rows.filter((r) => r.verificationPass);
  const report = `# MB Wave 50 — Impact Report

**Generated:** ${new Date().toISOString()}  
**Phase:** 20 — Wave 50 recovery  
**Classification:** **${result.classification}**  
**Prior cumulative:** ${WAVE_25_CUMULATIVE_IDS.length} proposals (Wave 5+10+25)  
**Target:** ${WAVE_50_TARGET} READY proposals  
**Selected / applied:** ${result.proposalIds.length}  
**Applied IDs:** ${result.proposalIds.join(", ") || "—"}

---

## Readiness at apply time

| Verdict | Count |
|---------|------:|
| READY | **${result.readiness.ready}** |
| NEEDS_REVIEW | ${result.readiness.needsReview} |
| BLOCKED | ${result.readiness.blocked} |
| Selected this wave | **${result.readiness.selected}** |

${result.stagedIncremental ? `**Staging:** +${result.stagedIncremental.approve} approve / ${result.stagedIncremental.staged} groups\n` : ""}
${result.stoppedEarly ? `**Stopped early:** ${result.stopReason}\n` : ""}

---

## Impact summary

| Metric | Value |
|--------|------:|
| Proposals applied | **${passed.length}** |
| Albums created | **${result.impact.albumsAdded}** |
| RVTR links added | **${result.impact.rvtrLinksAdded}** |
| Hot 100 gain | **+${result.impact.hot100Gain}** |
| Covers acquired | **${result.coversAcquired}** |
| Covers complete (CDN 200) | **${result.impact.coversComplete}** |
| Covers review-held | **${result.coversReviewHeld}** |
| Covers failed | **${result.impact.coversFailed}** |
| Covers skipped (flag off) | ${result.impact.coversSkipped} |

---

## Baseline → After

| Metric | Before | After |
|--------|-------:|------:|
${metricsTable(result.baseline)
  .split("\n")
  .map((line) => {
    const m = line.match(/^\| (.+) \| ([\d,]+) \|$/);
    if (!m) return line;
    const key = m[1];
    const before = m[2];
    const afterMap: Record<string, number> = {
      "Linked RVTRs": result.after.linkedRvtrCount,
      "Hot 100 linked": result.after.hot100Linked,
      "Hot 100 missing": result.after.hot100Missing,
      "Album count": result.after.albumCount,
    };
    const afterVal = afterMap[key];
    return afterVal != null
      ? `| ${key} | ${before} | ${afterVal.toLocaleString()} |`
      : line;
  })
  .join("\n")}

---

## Verification results

| Check | Pass |
|-------|-----:|
| Ingest verify | **${passed.length}** / ${result.proposalIds.length} |
| Track page album module | **${result.rows.filter((r) => r.trackPageLoads).length}** |
| Album page | **${result.rows.filter((r) => r.albumPageLoads).length}** |
| Artist relationship | **${result.rows.filter((r) => r.artistAlbumListed).length}** |
| coverUrl CDN 200 | **${result.rows.filter((r) => r.coverUrlVerified).length}** |

---

## Per-proposal

| ID | RVTR | Album | RVAL | Track | Album | Artist | Cover | CDN | Verify |
|----|------|-------|------|:-----:|:-----:|:------:|:-----:|:---:|:------:|
${result.rows
  .map(
    (r) =>
      `| ${r.proposalId} | ${r.rvtr} | ${r.albumTitle} | ${r.rval ?? "—"} | ${r.trackPageLoads ? "✓" : "✗"} | ${r.albumPageLoads ? "✓" : "✗"} | ${r.artistAlbumListed ? "✓" : "✗"} | ${r.coverComplete ? "✓" : r.coverOutcome === "review_held" ? "hold" : "✗"} | ${r.coverUrlVerified ? "✓" : "✗"} | ${r.verificationPass ? "PASS" : "FAIL"} |`,
  )
  .join("\n")}

---

**Stop rule:** Wave 50 complete — do not proceed to Wave 250 automatically.

\`\`\`bash
RETROVERSE_MB_INGEST_APPLY=1 RETROVERSE_MB_COVER_APPLY=1 npm run mb:wave-50:apply
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-wave-50-impact.md");
  await writeFile(reportPath, report);
  const jsonPath = join(process.cwd(), "tools/out/mb-wave-50-apply.json");
  await writeFile(jsonPath, JSON.stringify(result, null, 2));
  return reportPath;
}
