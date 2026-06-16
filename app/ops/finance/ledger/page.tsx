import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceLedgerClient } from "@/components/ops/finance/FinanceLedgerClient";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { queryLedger } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transaction Ledger — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceLedgerPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <main className="ops-page">
        <div className="ops-page__inner">
          <p>Postgres offline.</p>
        </div>
      </main>
    );
  }

  await ensureFinanceSchema();
  const [ledger, accounts] = await Promise.all([queryLedger({ limit: 500 }), listFinanceAccounts()]);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance</p>
            <h1 className="ops-topbar__title">Transaction Ledger</h1>
            <p className="ops-topbar__sub">Spreadsheet register · sort · filter · inline edit · bulk rules</p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/merchants">
              Merchants
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/import">
              Import
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance">
              Finance Home
            </Link>
          </div>
        </header>

        <FinanceLedgerClient initialTransactions={ledger} accounts={accounts} />
      </div>
    </main>
  );
}
