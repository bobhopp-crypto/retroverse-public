import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceMerchantDetailClient } from "@/components/ops/finance/FinanceMerchantDetailClient";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { getMerchantDetail } from "@/lib/ops/finance/db/merchants";
import { queryLedger } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../../ops.css";
import "../../../finance-ops.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ merchantKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { merchantKey } = await params;
  return {
    title: `Merchant ${decodeURIComponent(merchantKey)} — Finance Reports`,
    robots: { index: false, follow: false },
  };
}

export default async function OpsFinanceReportsMerchantDetailPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { merchantKey } = await params;
  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <FinanceShell title="Merchant" subtitle="Reports" active="reports">
        <p>Postgres offline.</p>
      </FinanceShell>
    );
  }

  await ensureFinanceSchema();
  const merchant = await getMerchantDetail(merchantKey);
  if (!merchant) notFound();

  const [transactions, accounts, importAttentionCount] = await Promise.all([
    queryLedger({ merchant: merchant.merchant, limit: 200 }),
    listFinanceAccounts(),
    countImportsNeedingAttention(),
  ]);

  return (
    <FinanceShell
      title={merchant.merchant}
      subtitle="Merchant detail"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <FinanceMerchantDetailClient
        merchant={merchant}
        transactions={transactions}
        accounts={accounts}
      />
    </FinanceShell>
  );
}
