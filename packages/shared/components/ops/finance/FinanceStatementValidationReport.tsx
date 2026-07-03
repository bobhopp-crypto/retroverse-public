import type { StatementIntegrityReport } from "@/lib/ops/finance/statement-integrity-validation";

type Props = {
  report: StatementIntegrityReport;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function FinanceStatementValidationReport({ report }: Props) {
  return (
    <div className="ops-finance-account">
      <section className="ops-finance-account__header">
        <h1 className="ops-finance-gt__heading">Statement Validation</h1>
        <p className="ops-finance-gt__note">
          Per-account statement math only — beginning + activity = ending. No cross-institution matching.
          Generated {report.generatedAt.replace("T", " ").slice(0, 19)} · {report.statementCount}{" "}
          statements · {report.summary.passCount} PASS · {report.summary.warningCount} WARNING ·{" "}
          {report.summary.failCount} FAIL
        </p>
      </section>

      <section className="ops-finance-account__section">
        <div className="ops-finance-gt__table-wrap">
          <table className="ops-finance-gt__table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Statement</th>
                <th>Status</th>
                <th>Result</th>
                <th>Beginning</th>
                <th>Ending</th>
                <th>Calculated</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, idx) => (
                <tr key={`${row.accountSlug}-${row.importId ?? idx}-${row.statementLabel}`}>
                  <td>{row.accountName}</td>
                  <td>{row.statementLabel}</td>
                  <td>{row.status}</td>
                  <td>{row.classification}</td>
                  <td>{fmt(row.beginningBalance)}</td>
                  <td>{fmt(row.endingBalance)}</td>
                  <td>{fmt(row.calculatedEnding)}</td>
                  <td>
                    {row.issues.length || row.notes.length || row.recommendation ? (
                      <ul className="ops-finance-validation__issues">
                        {row.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                        {row.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                        {row.recommendation ? <li>{row.recommendation}</li> : null}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
