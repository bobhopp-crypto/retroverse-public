import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import {
  listInstitutionAccountStatements,
  listMortgagePaymentStatements,
} from "@/lib/ops/finance/db/account-statements";
import { listAppleCardStatements } from "@/lib/ops/finance/db/apple-card-statements";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { INSTITUTION_ACCOUNT_SLUGS } from "@/lib/ops/finance/institution-accounts-config";

export type StatementValidationClassification = "PASS" | "WARNING" | "FAIL";

export type StatementValidationRow = {
  accountName: string;
  accountSlug: string;
  statementLabel: string;
  importId: number | null;
  status: string;
  transactionCount: number;
  ledgerTransactionCount: number;
  archivedTransactionCount: number;
  beginningBalance: number | null;
  endingBalance: number | null;
  calculatedEnding: number | null;
  reportedDifference: number | null;
  reconciled: boolean;
  classification: StatementValidationClassification;
  issues: string[];
  notes: string[];
  recommendation: string | null;
};

export type StatementIntegrityReport = {
  generatedAt: string;
  statementCount: number;
  totalLedgerTransactions: number;
  rows: StatementValidationRow[];
  summary: {
    passCount: number;
    warningCount: number;
    failCount: number;
    ok: number;
    withIssues: number;
  };
};

/**
 * Statements are authoritative. Only fail when statement math does not close:
 * Beginning Balance + Activity = Ending Balance (per institution, no cross-account matching).
 */
function statementBalanceDelta(input: {
  beginning: number | null;
  ending: number | null;
  activity: number | null;
}): number | null {
  if (input.beginning == null || input.ending == null || input.activity == null) return null;
  return Number((input.ending - (input.beginning + input.activity)).toFixed(2));
}

function liabilityStatementDelta(input: {
  previous: number;
  ending: number;
  payments: number;
  charges: number;
}): number {
  const expected = Number((input.previous - input.payments + input.charges).toFixed(2));
  return Number((input.ending - expected).toFixed(2));
}

function classifyRow(issues: string[]): StatementValidationClassification {
  if (!issues.length) return "PASS";
  return "FAIL";
}

export async function loadStatementIntegrityReport(): Promise<StatementIntegrityReport | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;
  await ensureFinanceSchema();

  const accounts = await inspectQuery<{
    id: number;
    slug: string;
    name: string;
  }>(
    `SELECT id, slug, name FROM finance_institution_accounts
     WHERE slug = ANY($1::text[])
     ORDER BY array_position($1::text[], slug)`,
    [INSTITUTION_ACCOUNT_SLUGS],
  );

  const rows: StatementValidationRow[] = [];

  for (const acct of accounts) {
    if (acct.slug === "apple-card") {
      const appleStatements = await listAppleCardStatements(acct.id, 36);
      for (const stmt of appleStatements) {
        const issues: string[] = [];
        const notes: string[] = [
          "Apple Card statement fields only — ledger not required to match",
        ];
        const payments = stmt.paymentTotal ?? 0;
        const charges = (stmt.purchaseTotal ?? 0) + stmt.interestTotal;
        const delta = liabilityStatementDelta({
          previous: stmt.previousBalance,
          ending: stmt.endingBalance,
          payments,
          charges,
        });
        const calculatedEnding = Number(
          (stmt.previousBalance - payments + charges).toFixed(2),
        );

        if (Math.abs(delta) > 0.01) {
          issues.push(
            `Statement does not balance: previous ${stmt.previousBalance.toFixed(2)} − payments ${payments.toFixed(2)} + charges ${charges.toFixed(2)} ≠ ending ${stmt.endingBalance.toFixed(2)} (off by ${delta.toFixed(2)})`,
          );
        }

        rows.push({
          accountName: acct.name,
          accountSlug: acct.slug,
          statementLabel: stmt.statementPeriod,
          importId: stmt.rawImportId,
          status: stmt.workflowStatus,
          transactionCount: stmt.transactionCount,
          ledgerTransactionCount: 0,
          archivedTransactionCount: 0,
          beginningBalance: stmt.previousBalance,
          endingBalance: stmt.endingBalance,
          calculatedEnding,
          reportedDifference: delta,
          reconciled: stmt.workflowStatus === "reconciled" || stmt.workflowStatus === "posted",
          classification: classifyRow(issues),
          issues,
          notes,
          recommendation: issues.length
            ? "Re-import or correct statement totals on the PDF — no cross-account matching required"
            : null,
        });
      }
      continue;
    }

    const statements =
      acct.slug === "mortgage"
        ? await listMortgagePaymentStatements(24)
        : await listInstitutionAccountStatements(acct.id, acct.slug);

    for (const stmt of statements) {
      const issues: string[] = [];
      const notes: string[] = [];
      let recommendation: string | null = null;

      const isMortgageBalanceOnly = acct.slug === "mortgage";

      if (isMortgageBalanceOnly) {
        notes.push("Mortgage: principal balance on statement — no activity roll-forward required");
        rows.push({
          accountName: acct.name,
          accountSlug: acct.slug,
          statementLabel: stmt.label,
          importId: stmt.importId,
          status: stmt.status,
          transactionCount: stmt.transactionCount,
          ledgerTransactionCount: stmt.ledgerTransactionCount,
          archivedTransactionCount: 0,
          beginningBalance: stmt.beginningBalance,
          endingBalance: stmt.endingBalance,
          calculatedEnding: null,
          reportedDifference: stmt.difference,
          reconciled: stmt.reconciled,
          classification: "PASS",
          issues,
          notes,
          recommendation: null,
        });
        continue;
      }

      let computedActivity: number | null = null;
      let calculatedEnding: number | null = null;

      if (stmt.importId != null) {
        const importMeta = await inspectQuery<{
          computed_activity: string | null;
          balance_difference: string | null;
          nebat_additions: string | null;
          nebat_subtractions: string | null;
        }>(
          `SELECT fi.computed_activity::text, fi.balance_difference::text,
                  ns.total_additions::text AS nebat_additions,
                  ns.total_subtractions::text AS nebat_subtractions
           FROM finance_imports fi
           LEFT JOIN finance_nebat_statements ns ON ns.raw_import_id = fi.id
           WHERE fi.id = $1`,
          [stmt.importId],
        );
        const meta = importMeta[0];
        if (meta?.computed_activity != null) {
          computedActivity = Number(meta.computed_activity);
        } else if (meta?.nebat_additions != null && meta?.nebat_subtractions != null) {
          computedActivity = Number(meta.nebat_additions) - Number(meta.nebat_subtractions);
        }

        if (stmt.beginningBalance != null && computedActivity != null) {
          calculatedEnding = Number((stmt.beginningBalance + computedActivity).toFixed(2));
        }
      }

      const reportedDiff =
        stmt.difference ??
        statementBalanceDelta({
          beginning: stmt.beginningBalance,
          ending: stmt.endingBalance,
          activity: computedActivity,
        });

      if (
        stmt.beginningBalance != null &&
        stmt.endingBalance != null &&
        computedActivity != null &&
        reportedDiff != null &&
        Math.abs(reportedDiff) > 0.01
      ) {
        issues.push(
          `Statement does not balance: beginning ${stmt.beginningBalance.toFixed(2)} + activity ${computedActivity.toFixed(2)} ≠ ending ${stmt.endingBalance.toFixed(2)} (off by ${reportedDiff.toFixed(2)})`,
        );
        recommendation =
          "Fix statement import totals from the PDF. Transactions in the ledger are analytical and do not need to match dollar-for-dollar.";
      } else if (
        stmt.beginningBalance == null ||
        stmt.endingBalance == null ||
        computedActivity == null
      ) {
        notes.push("Incomplete statement totals — cannot verify beginning + activity = ending");
      } else {
        notes.push("Statement balances — per-account only, no cross-institution matching");
      }

      rows.push({
        accountName: acct.name,
        accountSlug: acct.slug,
        statementLabel: stmt.label,
        importId: stmt.importId,
        status: stmt.status,
        transactionCount: stmt.transactionCount,
        ledgerTransactionCount: stmt.ledgerTransactionCount,
        archivedTransactionCount: 0,
        beginningBalance: stmt.beginningBalance,
        endingBalance: stmt.endingBalance,
        calculatedEnding,
        reportedDifference: reportedDiff,
        reconciled: stmt.reconciled,
        classification: classifyRow(issues),
        issues,
        notes,
        recommendation,
      });
    }
  }

  const passCount = rows.filter((r) => r.classification === "PASS").length;
  const warningCount = rows.filter((r) => r.classification === "WARNING").length;
  const failCount = rows.filter((r) => r.classification === "FAIL").length;

  const report: StatementIntegrityReport = {
    generatedAt: new Date().toISOString(),
    statementCount: rows.length,
    totalLedgerTransactions: rows.reduce((s, r) => s + r.ledgerTransactionCount, 0),
    rows,
    summary: {
      passCount,
      warningCount,
      failCount,
      ok: passCount,
      withIssues: warningCount + failCount,
    },
  };

  try {
    const outPath = join(process.cwd(), "reports/finance-statement-validation.json");
    await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  } catch {
    // best-effort
  }

  return report;
}
