/**
 * VIDEO Match Confidence Audit — classify 8,476 matched VIDEO tracks.
 * Usage: npm run ops:video-match-confidence-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/match-agent-phase-3");
  await mkdir(outDir, { recursive: true });

  const {
    runVideoMatchConfidenceAudit,
    formatVideoMatchConfidenceMarkdown,
    leastTrustworthyToCsv,
  } = await import("../lib/ops/video-match-confidence-audit.ts");

  const audit = await runVideoMatchConfidenceAudit({
    conflictCsvPath: join(outDir, "conflict-reassignment.csv"),
    leastTrustworthyLimit: 500,
  });

  const md = formatVideoMatchConfidenceMarkdown(audit);

  await Promise.all([
    writeFile(join(outDir, "VIDEO-MATCH-CONFIDENCE-AUDIT.md"), md, "utf8"),
    writeFile(
      join(outDir, "video-match-confidence-audit.json"),
      JSON.stringify(audit, null, 2),
      "utf8",
    ),
    writeFile(
      join(outDir, "least-trustworthy-500.csv"),
      leastTrustworthyToCsv(audit.leastTrustworthy),
      "utf8",
    ),
  ]);

  console.log("VIDEO Match Confidence Audit");
  console.log(
    JSON.stringify(
      { total: audit.total, buckets: audit.buckets, bucketPct: audit.bucketPct },
      null,
      2,
    ),
  );
  console.log(`\nWrote: ${join(outDir, "VIDEO-MATCH-CONFIDENCE-AUDIT.md")}`);
  console.log(`Wrote: ${join(outDir, "least-trustworthy-500.csv")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
