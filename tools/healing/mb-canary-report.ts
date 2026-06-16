/**
 * Regenerate MB-CANARY-25 proposal report from staged rows.
 * Usage: npm run mb:canary:report
 */
import { writeMbCanaryReport } from "@/lib/healing/mb-ingest/report";

async function main() {
  const result = await writeMbCanaryReport();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
