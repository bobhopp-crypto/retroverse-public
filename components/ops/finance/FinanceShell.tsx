import Link from "next/link";
import type { ReactNode } from "react";

import {
  INSTITUTION_ACCOUNT_SLUGS,
  institutionAccountHref,
  type InstitutionAccountSlug,
} from "@/lib/ops/finance/institution-accounts-config";

const ACCOUNT_LABELS: Record<InstitutionAccountSlug, string> = {
  "nebat-checking": "NEBAT Checking",
  "apple-card": "Apple Card",
  paypal: "PayPal",
  mortgage: "Mortgage",
  "401k": "401(k)",
  savings: "Savings",
};

type Props = {
  title: string;
  subtitle?: string;
  refreshed?: string;
  importAttentionCount?: number;
  active?: "home" | "import" | "reports" | "account";
  accountSlug?: InstitutionAccountSlug;
  children: ReactNode;
};

export function FinanceShell({
  title,
  subtitle,
  refreshed,
  importAttentionCount = 0,
  active,
  accountSlug,
  children,
}: Props) {
  const importLabel =
    importAttentionCount > 0 ? `Import (${importAttentionCount})` : "Import";

  return (
    <main className="ops-page ops-finance-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · personal</p>
            <h1 className="ops-topbar__title">{title}</h1>
            {subtitle ? <p className="ops-topbar__sub">{subtitle}</p> : null}
          </div>
          <div className="ops-topbar__meta">
            {refreshed ? (
              <div>
                Refreshed <strong>{refreshed}</strong>
              </div>
            ) : null}
            <nav className="ops-finance-gt__nav" aria-label="Finance navigation">
              <Link
                href="/ops/finance"
                aria-current={active === "home" ? "page" : undefined}
              >
                Finance Home
              </Link>
              <Link
                href="/ops/finance/import"
                aria-current={active === "import" ? "page" : undefined}
              >
                {importLabel}
              </Link>
              <Link
                href="/ops/finance/reports"
                aria-current={active === "reports" ? "page" : undefined}
              >
                Reports
              </Link>
              <Link href="/ops">Ops Home</Link>
            </nav>
          </div>
        </header>

        <nav className="ops-finance-accounts-nav" aria-label="Accounts">
          {INSTITUTION_ACCOUNT_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={institutionAccountHref(slug)}
              className={`ops-finance-accounts-nav__card ${accountSlug === slug ? "ops-finance-accounts-nav__card--active" : ""}`}
              aria-current={accountSlug === slug ? "page" : undefined}
            >
              {ACCOUNT_LABELS[slug]}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </main>
  );
}
