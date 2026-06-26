/**
 * Graph Integrity Audit — Feat tokenization corruption in canonical titles.
 * Usage: npm run ops:graph-integrity-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-agent-phase-3");
  await mkdir(outDir, { recursive: true });

  const {
    runGraphIntegrityAudit,
    formatGraphIntegrityAuditMarkdown,
    featCorruptionToCsv,
  } = await import("../lib/ops/graph-integrity-audit.ts");

  const audit = await runGraphIntegrityAudit({
    leastTrustworthyCsvPath: join(outDir, "least-trustworthy-500.csv"),
  });

  const md = formatGraphIntegrityAuditMarkdown(audit);

  await Promise.all([
    writeFile(join(outDir, "GRAPH-INTEGRITY-AUDIT.md"), md, "utf8"),
    writeFile(join(outDir, "graph-integrity-audit.json"), JSON.stringify(audit, null, 2), "utf8"),
    writeFile(
      join(outDir, "feat-corruption-rvtrs.csv"),
      featCorruptionToCsv(audit.allCorruptRows),
      "utf8",
    ),
  ]);

  console.log("Graph Integrity Audit");
  console.log(
    JSON.stringify(
      {
        affectedRvtrCount: audit.affectedRvtrCount,
        byIdentitySource: audit.byIdentitySource,
        matchedVideoImpact: audit.matchedVideoImpact,
        graphLayer: audit.graphLayer,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote: ${join(outDir, "GRAPH-INTEGRITY-AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
