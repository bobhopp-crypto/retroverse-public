/**
 * Phase 20 — Wave 50 MB recovery apply + integrated covers.
 * Usage: RETROVERSE_MB_INGEST_APPLY=1 RETROVERSE_MB_COVER_APPLY=1 npm run mb:wave-50:apply
 */
import {
  runWave50Apply,
  writeWave50ImpactReport,
} from "@/lib/healing/mb-ingest/wave-50-apply";

async function main() {
  const result = await runWave50Apply();
  const reportPath = await writeWave50ImpactReport(result);
  console.log(
    JSON.stringify(
      {
        classification: result.classification,
        allPassed: result.allPassed,
        applied: result.rows.filter((r) => r.verificationPass).length,
        target: result.targetCount,
        coversAcquired: result.coversAcquired,
        coversFailed: result.impact.coversFailed,
        coversReviewHeld: result.coversReviewHeld,
        hot100Gain: result.impact.hot100Gain,
        reportPath,
        stopReason: result.stopReason,
      },
      null,
      2,
    ),
  );
  if (result.classification === "FAIL") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
