/**
 * Phase 6A — Wave 5 production apply (IDs 29, 32, 35, 36, 37).
 * Usage: RETROVERSE_MB_INGEST_APPLY=1 npm run mb:wave-5:apply
 */
import { runWave5Apply, writeWave5ApplyReport } from "@/lib/healing/mb-ingest/wave-apply";

async function main() {
  const result = await runWave5Apply();
  const reportPath = await writeWave5ApplyReport(result);

  console.log(
    JSON.stringify(
      {
        allPassed: result.allPassed,
        stoppedEarly: result.stoppedEarly,
        stopReason: result.stopReason,
        applied: result.rows.filter((r) => r.verificationPass).length,
        netGainHot100Linked: result.netGainHot100Linked,
        reportPath,
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
