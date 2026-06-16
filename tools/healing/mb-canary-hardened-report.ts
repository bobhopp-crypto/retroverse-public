/**
 * Regenerate MB-CANARY-25 hardened proposal report.
 * Usage: npm run mb:canary:hardened:report
 */
import { writeMbCanaryHardenedReport } from "@/lib/healing/mb-ingest/report";

async function main() {
  const result = await writeMbCanaryHardenedReport();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
