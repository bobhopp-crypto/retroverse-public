import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runApplyReadinessReview } from "@/lib/healing/mb-ingest/apply-readiness";
import { stageMbWave25Incremental } from "@/lib/healing/mb-ingest/stage";
import { WAVE_100_TARGET } from "@/lib/healing/mb-ingest/types";
import {
  loadGraphMetrics,
  resolveNextReadyProposalIds,
  runWave25Apply,
  type Wave25ApplyResult,
} from "@/lib/healing/mb-ingest/wave-25-apply";
import { WAVE_25_CUMULATIVE_IDS } from "@/lib/healing/mb-ingest/wave-25-phase8b";
import { inspectQuery } from "@/lib/inspect/pg";

/** Wave 100 uses wave-25 runner with expanded queue — wire full parameterized runner when available. */
export async function runWave100Apply(): Promise<Wave25ApplyResult> {
  await ensureWave100Queue(WAVE_100_TARGET);
  process.env.MB_WAVE_TARGET = String(WAVE_100_TARGET);
  return runWave25ApplyWithTarget(WAVE_100_TARGET);
}

async function loadAppliedProposalIds(): Promise<Set<number>> {
  const rows = await inspectQuery<{ proposal_id: number }>(
    `SELECT proposal_id FROM mb_album_ingest_proposals WHERE status = 'applied'`,
  );
  return new Set(rows.map((r) => Number(r.proposal_id)));
}

export async function ensureWave100Queue(minReady = WAVE_100_TARGET): Promise<void> {
  let ids = await resolveNextReadyProposalIds(minReady);
  for (let round = 0; ids.length < minReady && round < 4; round += 1) {
    await stageMbWave25Incremental("mb-wave-100-stage");
    ids = await resolveNextReadyProposalIds(minReady);
  }
}

async function runWave25ApplyWithTarget(target: number): Promise<Wave25ApplyResult> {
  const applied = await loadAppliedProposalIds();
  const readiness = await runApplyReadinessReview();
  const proposalIds = readiness.ready
    .filter((r) => !applied.has(r.proposalId))
    .sort((a, b) => b.chartWeeks - a.chartWeeks)
    .slice(0, target)
    .map((r) => r.proposalId);

  const baseline = await loadGraphMetrics();
  if (proposalIds.length === 0) {
    return {
      wave: "APPLY-100",
      targetCount: target,
      proposalIds: [],
      priorCumulativeIds: [...WAVE_25_CUMULATIVE_IDS],
      baseline,
      after: baseline,
      preApply: [],
      rows: [],
      stoppedEarly: true,
      stopReason: "no approve-ready proposals available",
      allPassed: false,
      stagedIncremental: null,
      impact: {
        albumsAdded: 0,
        rvtrLinksAdded: 0,
        hot100Gain: 0,
        albumPageGain: 0,
        artistRelationshipGain: 0,
        coversComplete: 0,
        coversSkipped: 0,
        coversFailed: 0,
      },
      nextQueue: [],
    };
  }

  // Delegate to proven runner for first N via env override in wave-25 (temporary).
  process.env.MB_WAVE_SLICE = proposalIds.join(",");
  return runWave25Apply();
}

export async function writeWave100ImpactReport(result: Wave25ApplyResult): Promise<string> {
  const reportPath = join(process.cwd(), "reports/mb-wave-100-impact.md");
  await writeFile(
    reportPath,
    `# MB Wave 100 — Impact Report\n\n**Generated:** ${new Date().toISOString()}\n**Result:** ${result.allPassed ? "PASS" : "FAIL"}\n`,
  );
  return reportPath;
}
