/**
 * Phase 5H — MB ingest rollback dry-run validation.
 * Usage: npm run mb:rollback:validate -- 29
 */
import { ensureMbIngestApplySchema } from "@/lib/healing/mb-ingest/apply-plan";
import { writeRollbackValidationReport } from "@/lib/healing/mb-ingest/rollback-validation";

async function main() {
  const proposalId = Number(process.argv[2] ?? "29");
  if (!Number.isFinite(proposalId) || proposalId <= 0) {
    console.error("Usage: npm run mb:rollback:validate -- <proposalId>");
    process.exit(1);
  }

  await ensureMbIngestApplySchema();
  const result = await writeRollbackValidationReport(proposalId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
