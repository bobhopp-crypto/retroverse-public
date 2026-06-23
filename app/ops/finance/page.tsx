import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceSpendingHome } from "@/components/ops/finance/FinanceSpendingHome";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { loadFinanceSpendingHome } from "@/lib/ops/finance/load-finance-spending-home";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../ops.css";
import "./finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsFinancePage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const data = await loadFinanceSpendingHome();
  if (!data) {
    notFound();
  }
  const refreshed = data.generatedAt.replace("T", " ").slice(0, 19);

  let importAttentionCount = data.importsNeedingAttention;
  const ping = await inspectPing();
  if (ping.ok) {
    await ensureFinanceSchema();
    importAttentionCount = await countImportsNeedingAttention();
  }

  return (
    <FinanceShell
      title="Finance Home"
      subtitle="Cash · Debt · Spending"
      refreshed={refreshed}
      importAttentionCount={importAttentionCount}
      active="home"
    >
      <FinanceSpendingHome data={{ ...data, importsNeedingAttention: importAttentionCount }} />
    </FinanceShell>
  );
}
