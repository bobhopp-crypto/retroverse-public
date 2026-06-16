import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceMerchantsClient } from "@/components/ops/finance/FinanceMerchantsClient";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { listMerchantSummaries } from "@/lib/ops/finance/db/merchants";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merchant Review — Retroverse Ops",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpsFinanceMerchantsPage({ searchParams }: Props) {
  if (!isOpsEnabled()) notFound();

  const raw = await searchParams;
  const pendingOnly = raw.pending !== "0";
  const activeBookkeepingOnly = raw.history !== "1";

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
  const [merchants, accounts] = await Promise.all([
    listMerchantSummaries({ pendingOnly, activeBookkeepingOnly, limit: 300 }),
    listFinanceAccounts(),
  ]);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance</p>
            <h1 className="ops-topbar__title">Merchant Review</h1>
            <p className="ops-topbar__sub">One row per merchant · assign account once · create rules</p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/review">
              Review queue
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/ledger">
              Ledger
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance">
              Finance Home
            </Link>
          </div>
        </header>

        <FinanceMerchantsClient
          merchants={merchants}
          accounts={accounts}
          pendingOnly={pendingOnly}
          activeBookkeepingOnly={activeBookkeepingOnly}
        />
      </div>
    </main>
  );
}
