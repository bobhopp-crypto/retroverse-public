/**
 * Phase 22 — Wave 100 preparation (stage + readiness; no apply).
 * Usage: npm run mb:wave-100:prep
 */
import { runWave100Prep, writeWave100PrepReport } from "@/lib/healing/mb-ingest/wave-100-prep";

async function main() {
  const result = await runWave100Prep();
  const reportPath = await writeWave100PrepReport(result);
  console.log(JSON.stringify({ ...result, reportPath }, null, 2));
  if (result.ready < 120) {
    console.error(`Wave 100 prep incomplete: READY=${result.ready} (need ≥120)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
