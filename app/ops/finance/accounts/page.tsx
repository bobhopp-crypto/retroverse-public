import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceAccountsClient } from "@/components/ops/finance/FinanceAccountsClient";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chart of Accounts — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceAccountsPage() {
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
  const accounts = await listFinanceAccounts();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance</p>
            <h1 className="ops-topbar__title">Chart of Accounts</h1>
            <p className="ops-topbar__sub">Workbook APPLE column E · merchant rules map here</p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/review">
              Review
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

        <FinanceAccountsClient accounts={accounts} />
      </div>
    </main>
  );
}
