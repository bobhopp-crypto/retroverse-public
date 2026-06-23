import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceAccountsClient } from "@/components/ops/finance/FinanceAccountsClient";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chart of Accounts — Finance Reports",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceChartOfAccountsPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <FinanceShell title="Chart of Accounts" subtitle="Bookkeeping configuration" active="reports">
        <p>Postgres offline.</p>
      </FinanceShell>
    );
  }

  await ensureFinanceSchema();
  const [accounts, importAttentionCount] = await Promise.all([
    listFinanceAccounts(),
    countImportsNeedingAttention(),
  ]);

  return (
    <FinanceShell
      title="Chart of Accounts"
      subtitle="Bookkeeping categories · merchant rules map here"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <FinanceAccountsClient accounts={accounts} />
    </FinanceShell>
  );
}
