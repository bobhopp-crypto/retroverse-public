import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceMerchantDetailClient } from "@/components/ops/finance/FinanceMerchantDetailClient";
import { listFinanceAccounts } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { getMerchantDetail } from "@/lib/ops/finance/db/merchants";
import { queryLedger } from "@/lib/ops/finance/db/transactions";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ merchantKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { merchantKey } = await params;
  return {
    title: `Merchant ${decodeURIComponent(merchantKey)} — Finance Ops`,
    robots: { index: false, follow: false },
  };
}

export default async function OpsFinanceMerchantDetailPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { merchantKey } = await params;
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
  const merchant = await getMerchantDetail(merchantKey);
  if (!merchant) notFound();

  const [transactions, accounts] = await Promise.all([
    queryLedger({ merchant: merchant.merchant, limit: 200 }),
    listFinanceAccounts(),
  ]);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance · merchant</p>
            <h1 className="ops-topbar__title">{merchant.merchant}</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/merchants">
              Merchants
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance/ledger">
              Ledger
            </Link>
          </div>
        </header>

        <FinanceMerchantDetailClient merchant={merchant} transactions={transactions} accounts={accounts} />
      </div>
    </main>
  );
}
