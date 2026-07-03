import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceDashboard } from "@/components/ops/finance/FinanceDashboard";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { loadFinanceDashboard } from "@/lib/ops/finance/load-finance-dashboard";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spending Analysis — Finance Reports",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceReportsAnalyticsPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <FinanceShell title="Spending Analysis" subtitle="Reports" active="reports">
        <p>Postgres offline.</p>
      </FinanceShell>
    );
  }

  await ensureFinanceSchema();
  const [data, importAttentionCount] = await Promise.all([
    loadFinanceDashboard(),
    countImportsNeedingAttention(),
  ]);

  return (
    <FinanceShell
      title="Spending Analysis"
      subtitle="Categories, trends, retirement and tax views"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <FinanceDashboard data={data} />
    </FinanceShell>
  );
}
