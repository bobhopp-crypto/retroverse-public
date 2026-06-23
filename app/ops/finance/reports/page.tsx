import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";
import "../finance-ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports — Finance",
  robots: { index: false, follow: false },
};

const REPORT_LINKS = [
  {
    href: "/ops/finance/reports/category-audit",
    title: "Category Audit",
    description: "Largest merchants per category — fix miscategorization",
  },
  {
    href: "/ops/finance/reports/ledger",
    title: "Combined Ledger",
    description: "All accounts · accounting and tax reference",
  },
  {
    href: "/ops/finance/reports/chart-of-accounts",
    title: "Chart of Accounts",
    description: "Bookkeeping categories and merchant mapping",
  },
  {
    href: "/ops/finance/reports/merchants",
    title: "Merchant Rules",
    description: "Assign categories by merchant",
  },
  {
    href: "/ops/finance/reports/analytics",
    title: "Spending Analysis",
    description: "Categories, trends, and advanced views",
  },
];

export default async function OpsFinanceReportsPage() {
  if (!isOpsEnabled()) notFound();

  let importAttentionCount = 0;
  const ping = await inspectPing();
  if (ping.ok) {
    await ensureFinanceSchema();
    importAttentionCount = await countImportsNeedingAttention();
  }

  return (
    <FinanceShell
      title="Reports"
      subtitle="Accounting and analysis — not daily workflow"
      importAttentionCount={importAttentionCount}
      active="reports"
    >
      <div className="ops-finance-reports">
        {REPORT_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="ops-finance-reports__card">
            <h2>{link.title}</h2>
            <p>{link.description}</p>
          </Link>
        ))}
      </div>
    </FinanceShell>
  );
}
