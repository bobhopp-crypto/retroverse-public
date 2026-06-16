/**
 * Phase 8B — Full pipeline verify (album → RVTR → cover → R2 → CDN → public).
 * Usage: npm run mb:pipeline:verify
 */
import { WAVE_25_CUMULATIVE_IDS } from "@/lib/healing/mb-ingest/wave-25-phase8b";
import {
  runPipelineVerify,
  writePipelineVerifyReport,
} from "@/lib/healing/mb-ingest/pipeline-verify";

async function main() {
  const result = await runPipelineVerify(WAVE_25_CUMULATIVE_IDS);
  const reportPath = await writePipelineVerifyReport(result, "Wave 5+10+25 cumulative");
  console.log(
    JSON.stringify(
      {
        readyForWave50: result.readyForWave50,
        fullPass: result.summary.fullPass,
        total: result.summary.total,
        coverComplete: result.summary.coverComplete,
        reportPath,
      },
      null,
      2,
    ),
  );
  if (!result.readyForWave50) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
