import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceImportClient } from "@/components/ops/finance/FinanceImportClient";
import { listImportHistory, queryImportStats } from "@/lib/ops/finance/db/import-stats";
import { listRecentImports } from "@/lib/ops/finance/db/imports";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import type { FinanceImportStats } from "@/lib/ops/finance/finance-canonical-model";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance Import — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceImportPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  let recentImports: Awaited<ReturnType<typeof listRecentImports>> = [];
  let stats: FinanceImportStats = {
    lastImportDate: null,
    totalImports: 0,
    transactionsAdded: 0,
    transactionsUpdated: 0,
    transactionsAwaitingReview: 0,
  };
  let history: Awaited<ReturnType<typeof listImportHistory>> = [];

  if (ping.ok) {
    await ensureFinanceSchema();
    [recentImports, stats, history] = await Promise.all([
      listRecentImports(),
      queryImportStats(),
      listImportHistory(),
    ]);
  }

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance</p>
            <h1 className="ops-topbar__title">Import Center</h1>
            <p className="ops-topbar__sub">
              CSV statements · rule engine · review queue · replaces spreadsheet drops
            </p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/accounts">
              Accounts
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/import/nebat">
              NEBAT PDF
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/import-amazon">
              Amazon Import
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/ledger">
              Ledger
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/review">
              Review queue
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance">
              Finance Home
            </Link>
          </div>
        </header>

        {!ping.ok ? (
          <p className="ops-finance-import__error">
            Postgres offline — run migrations then retry.
          </p>
        ) : (
          <FinanceImportClient stats={stats} history={history} recentImports={recentImports} />
        )}
      </div>
    </main>
  );
}
