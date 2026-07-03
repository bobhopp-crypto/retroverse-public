import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceMerchantsClient } from "@/components/ops/finance/FinanceMerchantsClient";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { listMerchantSummaries } from "@/lib/ops/finance/db/merchants";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merchant Rules — Finance Reports",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpsFinanceReportsMerchantsPage({ searchParams }: Props) {
  if (!isOpsEnabled()) notFound();

  const raw = await searchParams;
  const pendingOnly = raw.pending !== "0";
  const activeBookkeepingOnly = raw.history !== "1";

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <FinanceShell title="Merchant Rules" subtitle="Reports" active="reports">
        <p>Postgres offline.</p>
      </FinanceShell>
    );
  }

  await ensureFinanceSchema();
  const [merchants, accounts, importAttentionCount] = await Promise.all([
    listMerchantSummaries({ pendingOnly, activeBookkeepingOnly, limit: 300 }),
    listFinanceAccounts(),
    countImportsNeedingAttention(),
  ]);

  return (
    <FinanceShell
      title="Merchant Rules"
      subtitle="One row per merchant · assign account once"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <FinanceMerchantsClient
        merchants={merchants}
        accounts={accounts}
        pendingOnly={pendingOnly}
        activeBookkeepingOnly={activeBookkeepingOnly}
      />
    </FinanceShell>
  );
}
