/**
 * Phase 5I — Live apply/rollback test for proposal 29 only.
 * Usage: RETROVERSE_MB_INGEST_APPLY=1 npm run mb:proposal-29:test
 */
import {
  runProposal29ApplyRollbackTest,
  writeProposal29TestReport,
} from "@/lib/healing/mb-ingest/proposal-29-test";

async function main() {
  const proposalArg = Number(process.argv[2] ?? "29");
  if (proposalArg !== 29) {
    console.error("This test is locked to proposal 29 only.");
    process.exit(1);
  }

  const result = await runProposal29ApplyRollbackTest();
  const reportPath = await writeProposal29TestReport(result);

  console.log(
    JSON.stringify(
      {
        passed: result.passed,
        errors: result.errors,
        reportPath,
        finalStatus: result.finalVerify.proposalStatus,
        rvtrLinked: result.finalVerify.rvtrLinked,
      },
      null,
      2,
    ),
  );

  if (!result.passed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
