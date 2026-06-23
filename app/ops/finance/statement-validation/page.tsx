import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { FinanceStatementValidationReport } from "@/components/ops/finance/FinanceStatementValidationReport";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { loadStatementIntegrityReport } from "@/lib/ops/finance/statement-integrity-validation";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statement Validation — Finance",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceStatementValidationPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <FinanceShell title="Statement Validation" subtitle="Phase A integrity check" active="import">
        <p>Postgres offline.</p>
      </FinanceShell>
    );
  }

  const [report, importAttentionCount] = await Promise.all([
    loadStatementIntegrityReport(),
    countImportsNeedingAttention(),
  ]);

  if (!report) {
    return (
      <FinanceShell title="Statement Validation" subtitle="Phase A integrity check" active="import">
        <p>Could not load validation report.</p>
      </FinanceShell>
    );
  }

  return (
    <FinanceShell
      title="Statement Validation"
      subtitle="Phase A · statement counts, balances, linkage"
      importAttentionCount={importAttentionCount}
      active="import"
    >
      <FinanceStatementValidationReport report={report} />
    </FinanceShell>
  );
}
