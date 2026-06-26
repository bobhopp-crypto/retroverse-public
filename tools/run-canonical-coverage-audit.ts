/**
 * Canonical Coverage Audit — identity distribution + reassignment simulation.
 * Usage: npm run ops:canonical-coverage-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-agent-phase-3");
  await mkdir(outDir, { recursive: true });

  const conflictCsv = join(outDir, "conflict-reassignment.csv");
  const { runCanonicalCoverageAudit, formatCanonicalCoverageAuditMarkdown } = await import(
    "../lib/ops/canonical-coverage-audit.ts"
  );

  const audit = await runCanonicalCoverageAudit(conflictCsv);
  const md = formatCanonicalCoverageAuditMarkdown(audit);

  await Promise.all([
    writeFile(join(outDir, "CANONICAL-COVERAGE-AUDIT.md"), md, "utf8"),
    writeFile(join(outDir, "canonical-coverage-audit.json"), JSON.stringify(audit, null, 2), "utf8"),
  ]);

  console.log("Canonical Coverage Audit");
  console.log(JSON.stringify(audit, null, 2));
  console.log(`\nWrote: ${join(outDir, "CANONICAL-COVERAGE-AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
