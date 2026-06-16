/**
 * Phase 7C — Publish MB-recovered covers to R2.
 * Usage: npm run mb:cover:r2-publish
 */
import { writeMbCoverR2PublishReport } from "@/lib/healing/mb-ingest/cover-r2-publish";

async function main() {
  const out = await writeMbCoverR2PublishReport();
  console.log(JSON.stringify({ reportPath: out.reportPath, summary: out.result.summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
