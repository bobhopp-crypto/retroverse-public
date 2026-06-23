import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceImportClient } from "@/components/ops/finance/FinanceImportClient";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { listImportHistory } from "@/lib/ops/finance/db/import-stats";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import — Finance",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceImportPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  let history: Awaited<ReturnType<typeof listImportHistory>> = [];
  let importAttentionCount = 0;

  if (ping.ok) {
    await ensureFinanceSchema();
    [history, importAttentionCount] = await Promise.all([
      listImportHistory(),
      countImportsNeedingAttention(),
    ]);
  }

  return (
    <FinanceShell
      title="Import"
      subtitle="Drop a statement · review · post"
      importAttentionCount={importAttentionCount}
      active="import"
    >
      {!ping.ok ? (
        <p className="ops-finance-import__error">Database offline — try again later.</p>
      ) : (
        <FinanceImportClient history={history} />
      )}
    </FinanceShell>
  );
}
