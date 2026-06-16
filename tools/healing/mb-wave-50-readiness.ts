import { runApplyReadinessReview } from "@/lib/healing/mb-ingest/apply-readiness";
import { resolveNextReadyProposalIds } from "@/lib/healing/mb-ingest/wave-25-apply";
import { WAVE_50_TARGET } from "@/lib/healing/mb-ingest/types";
import { inspectQuery } from "@/lib/inspect/pg";

async function main() {
  const [readiness, next50] = await Promise.all([
    runApplyReadinessReview(),
    resolveNextReadyProposalIds(WAVE_50_TARGET),
  ]);
  const applied = new Set(
    (
      await inspectQuery<{ proposal_id: number }>(
        `SELECT proposal_id FROM mb_album_ingest_proposals WHERE status='applied'`,
      )
    ).map((r) => Number(r.proposal_id)),
  );
  const unapplied = readiness.ready.filter((r) => !applied.has(r.proposalId));
  console.log(
    JSON.stringify(
      {
        ready: readiness.ready.length,
        needsReview: readiness.needsReview.length,
        blocked: readiness.blocked.length,
        unappliedReady: unapplied.length,
        next50Count: next50.length,
        next50Ids: next50,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
