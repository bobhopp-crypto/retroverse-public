import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceCategoryAuditClient } from "@/components/ops/finance/FinanceCategoryAuditClient";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  loadCategoryAuditReport,
  loadMisclassificationFlags,
} from "@/lib/ops/finance/load-category-audit";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Category Audit — Finance",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceCategoryAuditPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (!ping.ok) notFound();
  await ensureFinanceSchema();

  const [audit, misclassification, importAttentionCount] = await Promise.all([
    loadCategoryAuditReport(),
    loadMisclassificationFlags(),
    countImportsNeedingAttention(),
  ]);

  return (
    <FinanceShell
      title="Category Audit"
      subtitle="Find and fix miscategorized spending"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <FinanceCategoryAuditClient audit={audit} misclassification={misclassification} />
    </FinanceShell>
  );
}
