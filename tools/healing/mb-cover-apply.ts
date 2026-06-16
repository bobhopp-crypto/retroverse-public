/**
 * Phase 7B — Apply covers for MB-ingested live albums.
 * Usage: RETROVERSE_MB_COVER_APPLY=1 npm run mb:cover:apply
 */
import { writeMbCoverApplyReport } from "@/lib/healing/mb-ingest/cover-apply";

async function main() {
  const result = await writeMbCoverApplyReport();
  console.log(JSON.stringify({ reportPath: result.reportPath, summary: result.result.summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
