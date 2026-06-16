/**
 * Phase 6C — Wave 10 apply + impact measurement.
 * Usage: RETROVERSE_MB_INGEST_APPLY=1 npm run mb:wave-10:apply
 */
import {
  loadGraphMetrics,
  runWave10Apply,
  writeWave10BaselineReport,
  writeWave10ImpactReport,
} from "@/lib/healing/mb-ingest/wave-10-apply";

async function main() {
  const baseline = await loadGraphMetrics();
  const baselinePath = await writeWave10BaselineReport(baseline);

  const result = await runWave10Apply();
  const impactPath = await writeWave10ImpactReport(result);

  console.log(
    JSON.stringify(
      {
        allPassed: result.allPassed,
        failures: result.failures,
        applied: result.rows.filter((r) => r.verificationPass).length,
        netGainHot100: result.after.hot100Linked - result.baseline.hot100Linked,
        netGainRvtr: result.after.linkedRvtrCount - result.baseline.linkedRvtrCount,
        baselinePath,
        impactPath,
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
