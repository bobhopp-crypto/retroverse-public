import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadFinanceIntegrityReport } from "../../lib/ops/finance/finance-data-integrity-audit";

function fmt(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

async function main() {
  const report = await loadFinanceIntegrityReport();
  if (!report) {
    console.error("Postgres offline or schema unavailable");
    process.exit(1);
  }

  const jsonPath = join(process.cwd(), "reports/finance-data-integrity-audit.json");
  const mdPath = join(process.cwd(), "reports/finance-data-integrity-audit.md");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const { passCount, failCount } = report.summary;
  const md = [
    "# Finance Data Integrity Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `**${passCount} PASS · ${failCount} FAIL** (${report.summary.total} checks)`,
    "",
    "| Check | UI | Calculated | Source Statement | Verdict |",
    "|-------|-----|------------|------------------|---------|",
    ...report.rows.map(
      (r) =>
        `| ${r.check} | ${fmt(r.uiValue)} | ${fmt(r.calculatedValue)} | ${fmt(r.sourceStatementValue)} | **${r.verdict}** |`,
    ),
    "",
    "## Notes",
    "",
    ...report.rows.map((r) => `- **${r.check}** (${r.verdict}): ${r.notes}`),
    "",
  ].join("\n");

  await writeFile(mdPath, md, "utf8");

  console.log(`\nFinance Data Integrity: ${passCount} PASS · ${failCount} FAIL\n`);
  for (const r of report.rows) {
    console.log(`[${r.verdict}] ${r.check}`);
    console.log(
      `  UI: ${fmt(r.uiValue)}  |  Calc: ${fmt(r.calculatedValue)}  |  Source: ${fmt(r.sourceStatementValue)}`,
    );
    console.log(`  ${r.notes}`);
  }
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`MD:   ${mdPath}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
