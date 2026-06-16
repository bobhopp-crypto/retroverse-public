/**
 * Phase 8B — Wave 25 verify + real-world impact (no re-apply, no covers).
 * Usage: npm run mb:wave-25:impact
 */
import { runWave25Phase8B, writeWave25Phase8BReport } from "@/lib/healing/mb-ingest/wave-25-phase8b";

async function main() {
  const result = await runWave25Phase8B();
  const reportPath = await writeWave25Phase8BReport(result);
  console.log(
    JSON.stringify(
      {
        allVerified: result.allVerified,
        applied: result.proposalsApplied.length,
        failures: result.failures,
        realWorld: result.realWorldSummary,
        reportPath,
      },
      null,
      2,
    ),
  );
  if (!result.allVerified) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
