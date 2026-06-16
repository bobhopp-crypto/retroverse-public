/**
 * Phase 6D — Real-world public page impact audit.
 * Usage: npm run mb:real-world:audit
 */
import { writeRealWorldImpactReport } from "@/lib/healing/mb-ingest/real-world-impact-audit";

async function main() {
  const result = await writeRealWorldImpactReport();
  console.log(JSON.stringify({ reportPath: result.reportPath, summary: result.audit.summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
