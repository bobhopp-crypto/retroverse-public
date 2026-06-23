import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceLedgerClient } from "@/components/ops/finance/FinanceLedgerClient";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { queryLedger } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Combined Ledger — Finance Reports",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceReportsLedgerPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <FinanceShell title="Combined Ledger" subtitle="Reports" active="reports">
        <p>Postgres offline.</p>
      </FinanceShell>
    );
  }

  await ensureFinanceSchema();
  const [ledger, accounts, importAttentionCount] = await Promise.all([
    queryLedger({ limit: 500 }),
    listFinanceAccounts(),
    countImportsNeedingAttention(),
  ]);

  return (
    <FinanceShell
      title="Combined Ledger"
      subtitle="All accounts · sort · filter · edit"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <FinanceLedgerClient initialTransactions={ledger} accounts={accounts} />
    </FinanceShell>
  );
}
