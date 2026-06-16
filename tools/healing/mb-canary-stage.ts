/**
 * Stage MB-CANARY-25 proposals (proposal table only — no canonical writes).
 * Usage: npm run mb:canary:stage
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { writeMbCanaryReport } from "@/lib/healing/mb-ingest/report";
import { stageMbCanary25 } from "@/lib/healing/mb-ingest/stage";

async function main() {
  const result = await stageMbCanary25();
  const report = await writeMbCanaryReport();

  const outDir = join(process.cwd(), "tools/out");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "mb-canary-stage-result.json"),
    JSON.stringify({ ...result, reportPath: report.reportPath }, null, 2),
  );

  console.log(JSON.stringify({ ...result, reportPath: report.reportPath }, null, 2));

  if (result.staged < 25) {
    console.warn(`[mb-canary] staged ${result.staged}/25 — see skipReasons`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
