"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  CategoryAuditReport,
  MisclassificationReport,
} from "@/lib/ops/finance/load-category-audit";
import { readOpsJsonResponse } from "@/lib/ops/finance/fetch-ops-json";
import type { SpendingEditCategoryId } from "@/lib/ops/finance/spending-category-config";

type Props = {
  audit: CategoryAuditReport;
  misclassification: MisclassificationReport;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceCategoryAuditClient({ audit, misclassification }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function quickFix(transactionId: number, categoryId: SpendingEditCategoryId) {
    if (!transactionId) return;
    setBusyId(transactionId);
    setError(null);
    try {
      const res = await fetch("/api/ops/finance/spending/drill-down", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          categoryId,
        }),
      });
      await readOpsJsonResponse(res);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ops-finance-audit">
      {misclassification.flags.length ? (
        <section className="ops-finance-audit__flags">
          <h2>Potential Misclassification</h2>
          <div className="ops-finance-gt__table-wrap">
            <table className="ops-finance-gt__table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Current</th>
                  <th>Suggested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {misclassification.flags.map((flag) => (
                  <tr key={flag.id}>
                    <td>{flag.reason}</td>
                    <td>{flag.merchant}</td>
                    <td>{flag.transactionId ? fmt(flag.amount) : "—"}</td>
                    <td>{flag.currentCategory}</td>
                    <td>{flag.suggestedLabel}</td>
                    <td>
                      {flag.transactionId ? (
                        <button
                          type="button"
                          className="ops-finance-account__btn"
                          disabled={busyId === flag.transactionId}
                          onClick={() =>
                            void quickFix(flag.transactionId, flag.suggestedCategory)
                          }
                        >
                          Fix
                        </button>
                      ) : (
                        <LinkToHome category={flag.suggestedCategory} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {audit.sections.map((section) => (
        <section key={section.categoryId} className="ops-finance-audit__section">
          <div className="ops-finance-audit__section-head">
            <h2>{section.categoryLabel}</h2>
            <strong>YTD {fmt(section.ytdTotal)}</strong>
          </div>
          <div className="ops-finance-gt__table-wrap">
            <table className="ops-finance-gt__table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Count</th>
                  <th>Total Spend</th>
                  <th>Current Category</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={`${section.categoryId}-${row.merchant}`}>
                    <td>{row.merchant}</td>
                    <td>{row.count}</td>
                    <td>{fmt(row.totalSpend)}</td>
                    <td>{row.currentCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {error ? <p className="ops-finance-import__error">{error}</p> : null}
    </div>
  );
}

function LinkToHome({ category }: { category: string }) {
  return (
    <a className="ops-finance-account__btn" href={`/ops/finance`}>
      Review on Home
    </a>
  );
}
