import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceStatementDetail } from "@/components/ops/finance/FinanceStatementDetail";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { loadStatementDetail } from "@/lib/ops/finance/load-statement-detail";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadStatementDetail(Number(id));
  return {
    title: data ? `${data.statement.statementPeriod} — Finance` : "Statement — Finance",
    robots: { index: false, follow: false },
  };
}

export default async function OpsFinanceStatementDetailPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { id } = await params;
  const statementId = Number(id);
  if (!Number.isFinite(statementId)) notFound();

  const data = await loadStatementDetail(statementId);
  if (!data) notFound();

  let importAttentionCount = 0;
  const ping = await inspectPing();
  if (ping.ok) {
    await ensureFinanceSchema();
    importAttentionCount = await countImportsNeedingAttention();
  }

  return (
    <FinanceShell
      title={data.statement.statementPeriod}
      subtitle={`${data.accountName} statement`}
      importAttentionCount={importAttentionCount}
      active="account"
      accountSlug="apple-card"
    >
      <FinanceStatementDetail data={data} />
    </FinanceShell>
  );
}
