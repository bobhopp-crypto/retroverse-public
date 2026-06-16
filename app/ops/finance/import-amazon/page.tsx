import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceAmazonImportClient } from "@/components/ops/finance/FinanceAmazonImportClient";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Amazon Import — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsFinanceAmazonImportPage() {
  if (!isOpsEnabled()) notFound();

  const ping = await inspectPing();
  if (ping.ok) await ensureFinanceSchema();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · finance</p>
            <h1 className="ops-topbar__title">Amazon Import</h1>
            <p className="ops-topbar__sub">
              Bulk Order History CSV (recommended) · optional Your Orders PDF · Apple Card for cashflow
            </p>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/finance/import">
              Import Center
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/finance">
              Finance Home
            </Link>
          </div>
        </header>

        {!ping.ok ? <p>Postgres offline.</p> : <FinanceAmazonImportClient />}
      </div>
    </main>
  );
}
