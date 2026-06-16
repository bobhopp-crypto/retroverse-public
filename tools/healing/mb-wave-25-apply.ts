/**
 * Phase 8A — Wave 25 MB recovery apply.
 * Usage: RETROVERSE_MB_INGEST_APPLY=1 npm run mb:wave-25:apply
 */
import { runWave25Apply, writeWave25ImpactReport } from "@/lib/healing/mb-ingest/wave-25-apply";

async function main() {
  const result = await runWave25Apply();
  const reportPath = await writeWave25ImpactReport(result);
  console.log(
    JSON.stringify(
      {
        allPassed: result.allPassed,
        applied: result.rows.filter((r) => r.verificationPass).length,
        impact: result.impact,
        nextQueueCount: result.nextQueue.length,
        reportPath,
        stopReason: result.stopReason,
      },
      null,
      2,
    ),
  );
  if (!result.allPassed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
