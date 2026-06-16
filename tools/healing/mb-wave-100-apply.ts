/**
 * Wave 100 apply entry — delegates to parameterized wave runner.
 * Usage: RETROVERSE_MB_INGEST_APPLY=1 RETROVERSE_MB_COVER_APPLY=1 npm run mb:wave-100:apply
 */
import { WAVE_100_TARGET } from "@/lib/healing/mb-ingest/types";
import { ensureWave100Queue, writeWave100ImpactReport } from "@/lib/healing/mb-ingest/wave-100-apply";

async function main() {
  console.error(
    "Wave 100 apply runner requires restored applyMbIngest + parameterized runMbWaveApply. " +
      `Use prep report command after tooling restore. Target: ${WAVE_100_TARGET}`,
  );
  await ensureWave100Queue(WAVE_100_TARGET);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
