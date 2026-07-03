import type { AccountRegisterSummary } from "@/lib/ops/finance/account-register";

type Props = {
  summary: AccountRegisterSummary;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceAccountRegisterSummary({ summary }: Props) {
  return (
    <p className="ops-finance-register__anchor">
      Starting balance from <strong>{summary.anchorLabel}</strong> statement:{" "}
      <strong>{fmt(summary.statementBalance)}</strong>
    </p>
  );
}
