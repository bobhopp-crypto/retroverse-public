/**
 * Phase 7A — Cover recovery audit for MB-ingested live albums.
 * Usage: npm run mb:cover:audit
 */
import { writeMbCoverRecoveryReport } from "@/lib/healing/mb-ingest/cover-recovery-audit";

async function main() {
  const result = await writeMbCoverRecoveryReport();
  console.log(
    JSON.stringify(
      {
        reportPath: result.reportPath,
        summary: result.audit.summary,
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
