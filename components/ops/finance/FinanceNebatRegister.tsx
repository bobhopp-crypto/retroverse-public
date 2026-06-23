import type { NebatRegisterRow } from "@/lib/ops/finance/account-register";

type Props = {
  rows: NebatRegisterRow[];
  openingBalance: number;
  openingLabel: string;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceNebatRegister({ rows, openingBalance, openingLabel }: Props) {
  return (
    <div className="ops-finance-register__scroll">
      <table className="ops-finance-gt__table ops-finance-register__table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Deposit</th>
            <th scope="col">Withdrawal</th>
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
            <tr key={`${row.date}-${row.description}-${i}`}>
              <td>{row.date}</td>
              <td>{row.description}</td>
              <td>{fmt(row.deposit)}</td>
              <td>{fmt(row.withdrawal)}</td>
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
