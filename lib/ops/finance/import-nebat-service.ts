import { inspectPing } from "@/lib/inspect/pg";

import { getFinanceAccountByName } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  createFinanceImport,
  saveImportFile,
  updateFinanceImport,
} from "@/lib/ops/finance/db/imports";
import { listFinanceRules } from "@/lib/ops/finance/db/rules";
import { insertFinanceTransactions } from "@/lib/ops/finance/db/transactions";
import type { ParsedFinanceRow } from "@/lib/ops/finance/finance-model";
import { buildDedupeKey } from "@/lib/ops/finance/finance-model";
import {
  parseNebatPdf,
  type ParsedNebatCheckingStatement,
  type ParsedNebatMortgageStatement,
} from "@/lib/ops/finance/parsers/nebat-pdf";
import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";

export type NebatImportResult = {
  fileName: string;
  importId: number;
  kind: "checking" | "mortgage";
  inserted: number;
  skipped: number;
  statementId: number | null;
  transactionCount: number;
};

async function storeCheckingStatement(
  parsed: ParsedNebatCheckingStatement,
  importId: number,
): Promise<number | null> {
  const rows = await inspectQuery<{ id: number }>(
    `INSERT INTO finance_nebat_statements
       (statement_start, statement_end, account_masked, beginning_balance, ending_balance,
        total_additions, total_subtractions, statement_type, raw_import_id, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'checking', $8, $9)
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING id`,
    [
      parsed.statementStart,
      parsed.statementEnd,
      parsed.accountMasked,
      parsed.beginningBalance,
      parsed.endingBalance,
      parsed.totalAdditions,
      parsed.totalSubtractions,
      importId,
      parsed.dedupeKey,
    ],
  );
  if (rows[0]?.id) return rows[0].id;
  const existing = await inspectQuery<{ id: number }>(
    `SELECT id FROM finance_nebat_statements WHERE dedupe_key = $1 LIMIT 1`,
    [parsed.dedupeKey],
  );
  return existing[0]?.id ?? null;
}

async function storeMortgageStatement(
  parsed: ParsedNebatMortgageStatement,
  importId: number,
): Promise<number | null> {
  const rows = await inspectQuery<{ id: number }>(
    `INSERT INTO finance_mortgage_statements
       (statement_date, payment_due_date, amount_due, scheduled_payment, principal, interest,
        escrow, outstanding_principal, interest_rate, maturity_date, activity_payment_amount,
        activity_payment_date, raw_import_id, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (dedupe_key) DO UPDATE SET
       outstanding_principal = EXCLUDED.outstanding_principal,
       scheduled_payment = EXCLUDED.scheduled_payment,
       principal = EXCLUDED.principal,
       interest = EXCLUDED.interest,
       escrow = EXCLUDED.escrow
     RETURNING id`,
    [
      parsed.statementDate,
      parsed.paymentDueDate,
      parsed.amountDue,
      parsed.scheduledPayment,
      parsed.principal,
      parsed.interest,
      parsed.escrow,
      parsed.outstandingPrincipal,
      parsed.interestRate,
      parsed.maturityDate,
      parsed.activityPaymentAmount,
      parsed.activityPaymentDate,
      importId,
      parsed.dedupeKey,
    ],
  );
  return rows[0]?.id ?? null;
}

export async function processNebatPdfUpload(input: {
  fileName: string;
  buffer: Buffer;
}): Promise<NebatImportResult> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  await ensureFinanceSchema();

  const parsed = await parseNebatPdf(input.buffer);
  const record = await createFinanceImport({
    source: "nebat",
    fileName: input.fileName,
    fileType: "application/pdf",
    status: "parsing",
  });
  const storagePath = await saveImportFile(record.id, input.fileName, input.buffer);

  if (parsed.kind === "mortgage") {
    const statementId = await storeMortgageStatement(parsed, record.id);
    await updateFinanceImport(record.id, {
      storagePath,
      status: statementId ? "parsed" : "empty",
      transactionCount: 0,
      errorMessage: null,
    });
    return {
      fileName: input.fileName,
      importId: record.id,
      kind: "mortgage",
      inserted: 0,
      skipped: 0,
      statementId,
      transactionCount: 0,
    };
  }

  const statementId = await storeCheckingStatement(parsed, record.id);
  const rows: ParsedFinanceRow[] = [];
  for (const txn of parsed.transactions) {
    const account = txn.accountName ? await getFinanceAccountByName(txn.accountName) : null;
    rows.push({
      transactionDate: txn.transactionDate,
      merchant: "NEBAT",
      description: txn.description,
      amount: txn.amount,
      source: "nebat",
      flowKind: txn.flowKind,
      accountName: account?.name ?? txn.accountName ?? undefined,
      subcategory: txn.description,
      dedupeKey: txn.dedupeKey,
    });
  }

  const rules = await listFinanceRules();
  const result = await insertFinanceTransactions(rows, record.id, rules);

  for (const txn of parsed.transactions) {
    if (!txn.taxTreatment) continue;
    await inspectExecute(
      `UPDATE finance_transactions
       SET tax_treatment = $1, importance = COALESCE(importance, $2), review_status = $3
       WHERE dedupe_key = $4`,
      [txn.taxTreatment, txn.importance, txn.reviewStatus, txn.dedupeKey],
    );
  }

  await updateFinanceImport(record.id, {
    storagePath,
    status: result.inserted || result.skipped ? "parsed" : "empty",
    transactionCount: result.inserted,
    transactionsInserted: result.inserted,
    transactionsSkipped: result.skipped,
    errorMessage: rows.length ? null : "No transactions found in PDF",
  });

  return {
    fileName: input.fileName,
    importId: record.id,
    kind: "checking",
    inserted: result.inserted,
    skipped: result.skipped,
    statementId,
    transactionCount: parsed.transactions.length,
  };
}
