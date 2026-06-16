import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FinanceDashboard } from "@/components/ops/finance/FinanceDashboard";
import { FinanceFiltersBar } from "@/components/ops/finance/FinanceFiltersBar";
import { countReviewQueue } from "@/lib/ops/finance/db/transactions";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { activeBookkeepingFilters, parseFinanceFilters } from "@/lib/ops/finance/finance-filters";
import { loadFinanceDashboard } from "@/lib/ops/finance/load-finance-dashboard";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../ops.css";
import "./finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance — Retroverse Ops",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpsFinancePage({ searchParams }: Props) {
  if (!isOpsEnabled()) {
    notFound();
  }

  const raw = await searchParams;
  const filters = parseFinanceFilters(raw);
  const data = await loadFinanceDashboard(filters);
  const refreshed = data.generatedAt.replace("T", " ").slice(0, 19);
  const filterSummary = data.activeFiltersLabel ?? data.periodLabel;

  let reviewCount = 0;
  const ping = await inspectPing();
  if (ping.ok) {
    await ensureFinanceSchema();
    reviewCount = await countReviewQueue(activeBookkeepingFilters());
  }

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · personal</p>
            <h1 className="ops-topbar__title">Finance Home</h1>
            <p className="ops-topbar__sub ops-finance__active-filters">{filterSummary}</p>
            <p className="ops-topbar__sub">
              {data.dataSource === "postgres" ? "live transactions" : "workbook snapshot"} · through{" "}
              {data.dataThrough}
            </p>
          </div>
          <div className="ops-topbar__meta">
            <div>
              Refreshed <strong>{refreshed}</strong>
            </div>
            <div>
              <Link className="ops-link" href="/ops/finance/import">
                Import
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/finance/ledger">
                Ledger
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/finance/ledger">
                Ledger
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/finance/accounts">
                Accounts
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops/finance/review">
                Review{reviewCount > 0 ? ` (${reviewCount})` : ""}
              </Link>
              {" · "}
              <Link className="ops-link" href="/ops">
                Ops Home
              </Link>
            </div>
          </div>
        </header>

        <Suspense fallback={null}>
          <FinanceFiltersBar />
        </Suspense>

        <FinanceDashboard data={data} />
      </div>
    </main>
  );
}
