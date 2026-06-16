/**
 * Backfill covers for Wave 25 MB recoveries.
 * Usage: RETROVERSE_MB_COVER_APPLY=1 npm run mb:cover:apply-wave25
 */
import { WAVE_25_NEW_IDS } from "@/lib/healing/mb-ingest/wave-25-phase8b";
import { runMbCoverApplyForProposalIds } from "@/lib/healing/mb-ingest/cover-apply";

async function main() {
  const result = await runMbCoverApplyForProposalIds(WAVE_25_NEW_IDS);
  console.log(
    JSON.stringify(
      {
        acquired: result.summary.acquired,
        alreadyComplete: result.summary.alreadyComplete,
        failed: result.summary.failed,
        publicCoverVerified: result.summary.publicCoverVerified,
        targets: result.targets.length,
      },
      null,
      2,
    ),
  );
  if (result.summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
