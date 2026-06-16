import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceReviewClient } from "@/components/ops/finance/FinanceReviewClient";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { listReviewQueue } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance Review — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceReviewPage() {
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
  const [queue, accounts] = await Promise.all([listReviewQueue(200), listFinanceAccounts()]);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance</p>
            <h1 className="ops-topbar__title">Review Queue</h1>
            <p className="ops-topbar__sub">Unknown merchants — assign once, rules handle the rest</p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/merchants?pending=1">
              Merchant Review
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

        <FinanceReviewClient queue={queue} accounts={accounts} />
      </div>
    </main>
  );
}
