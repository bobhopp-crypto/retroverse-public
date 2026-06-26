/**
 * Canonical Title Repair Phase 2 — hot100 normalized_key_mismatch rows.
 * Usage: npm run ops:canonical-title-repair-phase-2
 * Dry run: DRY_RUN=1 npm run ops:canonical-title-repair-phase-2
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/canonical-title-repair-phase-2");
  await mkdir(outDir, { recursive: true });
  const dryRun = process.env.DRY_RUN === "1";

  const {
    repairHot100NormalizedTitleKeys,
    formatHot100KeyRepairMarkdown,
    repairPlansToCsv,
  } = await import("../lib/ops/repair-hot100-title-keys.ts");

  const result = await repairHot100NormalizedTitleKeys({ outDir, dryRun });
  const md = formatHot100KeyRepairMarkdown(result);

  await Promise.all([
    writeFile(join(outDir, "AUDIT.md"), md, "utf8"),
    writeFile(join(outDir, "repair-result.json"), JSON.stringify(result, null, 2), "utf8"),
    writeFile(join(outDir, "repair-plans.csv"), repairPlansToCsv(result.planned), "utf8"),
  ]);

  console.log(dryRun ? "Canonical Title Repair Phase 2 (DRY RUN)" : "Canonical Title Repair Phase 2");
  console.log(
    JSON.stringify(
      {
        planned: result.planned.length,
        repaired: result.repaired,
        validation: result.validation,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote: ${join(outDir, "AUDIT.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
