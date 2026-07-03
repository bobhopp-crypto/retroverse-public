import type { AppleCardRegisterRow } from "@/lib/ops/finance/account-register";

type Props = {
  rows: AppleCardRegisterRow[];
  openingBalance: number;
  openingLabel: string;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceAppleCardRegister({ rows, openingBalance, openingLabel }: Props) {
  return (
    <div className="ops-finance-register__scroll">
      <table className="ops-finance-gt__table ops-finance-register__table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Charge</th>
            <th scope="col">Payment</th>
            <th scope="col">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="ops-finance-register__opening">
            <td>—</td>
            <td>{openingLabel}</td>
            <td>—</td>
            <td>—</td>
            <td className="ops-finance-register__balance">{fmt(openingBalance)}</td>
          </tr>
          {rows.map((row, i) => (
            <tr key={`${row.date}-${row.merchant}-${i}`}>
              <td>{row.date}</td>
              <td>{row.merchant}</td>
              <td>{fmt(row.charge)}</td>
              <td>{fmt(row.payment)}</td>
              <td className="ops-finance-register__balance">{fmt(row.runningBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="ops-finance-register__empty">No activity since this statement.</p>
      ) : null}
    </div>
  );
}
