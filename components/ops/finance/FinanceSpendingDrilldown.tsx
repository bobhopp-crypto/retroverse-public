import type { SpendingCategorySeries } from "@/lib/ops/finance/load-finance-spending-home";

type Props = {
  series: SpendingCategorySeries;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function FinanceSpendingDrilldown({ series }: Props) {
  return (
    <section className="ops-finance-spend__drill" aria-label={`${series.label} details`}>
      <div className="ops-finance-spend__drill-ytd">
        <span>{series.label} — Year to Date</span>
        <strong>{fmt(series.ytdSpend)}</strong>
      </div>

      <div className="ops-finance-spend__drill-grid">
        <div className="ops-finance-spend__drill-panel">
          <h3>Top Merchants</h3>
          {series.topMerchants.length ? (
            <table className="ops-finance-spend__drill-table">
              <thead>
                <tr>
                  <th scope="col">Merchant</th>
                  <th scope="col">YTD</th>
                </tr>
              </thead>
              <tbody>
                {series.topMerchants.map((row) => (
                  <tr key={row.merchant}>
                    <td>{row.merchant}</td>
                    <td>{fmt(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ops-finance-spend__drill-empty">No spending this year.</p>
          )}
        </div>

        <div className="ops-finance-spend__drill-panel">
          <h3>Recent Transactions</h3>
          {series.recentTransactions.length ? (
            <table className="ops-finance-spend__drill-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Merchant</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {series.recentTransactions.map((txn) => (
                  <tr key={`${txn.transactionDate}-${txn.merchant}-${txn.amount}`}>
                    <td>{fmtDate(txn.transactionDate)}</td>
                    <td>{txn.merchant}</td>
                    <td>{fmt(txn.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ops-finance-spend__drill-empty">No recent transactions.</p>
          )}
        </div>
      </div>
    </section>
  );
}
