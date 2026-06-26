/**
 * Title Repair Skip Audit — classify 410 skipped canonical_title repairs.
 * Usage: npm run ops:title-repair-skip-audit
 */
require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const root = join(import.meta.dirname, "..");
  const outDir = join(root, "reports/title-repair-skip-audit");
  await mkdir(outDir, { recursive: true });

  const {
    runTitleRepairSkipAudit,
    formatTitleRepairSkipAuditMarkdown,
    skipAuditToCsv,
  } = await import("../lib/ops/title-repair-skip-audit.ts");

  const audit = await runTitleRepairSkipAudit();
  const md = formatTitleRepairSkipAuditMarkdown(audit);

  await Promise.all([
    writeFile(join(outDir, "AUDIT.md"), md, "utf8"),
    writeFile(join(outDir, "skip-audit.json"), JSON.stringify(audit, null, 2), "utf8"),
    writeFile(join(outDir, "skip-audit.csv"), skipAuditToCsv(audit.allSkipped), "utf8"),
  ]);

  console.log("Title Repair Skip Audit");
  console.log(
    JSON.stringify(
      {
        totalSkipped: audit.totalSkipped,
        repairSkipReasons: audit.repairSkipReasons,
        groups: audit.groups.map((g) => ({ group: g.group, count: g.count })),
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
