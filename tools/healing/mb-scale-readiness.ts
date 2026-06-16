/**
 * Phase 6B — MB scale readiness (read-only).
 * Usage: npm run mb:scale:readiness
 */
import { writeScaleReadinessReport } from "@/lib/healing/mb-ingest/scale-readiness";

async function main() {
  const result = await writeScaleReadinessReport();
  console.log(
    JSON.stringify(
      {
        reportPath: result.reportPath,
        recommendedBatchSize: result.analysis.recommendedBatchSize,
        stagedApprove: result.analysis.inventory.stagedReady,
        scaledApprove: result.analysis.scaledEstimates.autoApprove,
        proposalsGeneratable: result.analysis.scaledEstimates.proposalsGeneratableToday,
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
