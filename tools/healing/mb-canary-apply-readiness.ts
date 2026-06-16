/**
 * Phase 5G — Apply readiness review (read-only, no canonical writes).
 * Usage: npm run mb:canary:apply-readiness
 */
import { writeApplyReadinessReport } from "@/lib/healing/mb-ingest/apply-readiness";

async function main() {
  const result = await writeApplyReadinessReport();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
