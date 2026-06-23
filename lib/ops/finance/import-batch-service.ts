import { inspectExecute, inspectPing } from "@/lib/inspect/pg";

import { getFinanceAccountByName } from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  createFinanceImport,
  getFinanceImport,
  saveImportFile,
  updateFinanceImport,
  type FinanceImportRecord,
} from "@/lib/ops/finance/db/imports";
import {
  clearImportStaging,
  computeStagingActivity,
  insertImportStaging,
  listImportStaging,
  stagingToParsedRows,
} from "@/lib/ops/finance/db/import-staging";
import { getInstitutionAccountForSource } from "@/lib/ops/finance/db/institution-accounts";
import { listFinanceRules } from "@/lib/ops/finance/db/rules";
import { insertFinanceTransactions } from "@/lib/ops/finance/db/transactions";
import type { FinanceImportPreviewRow } from "@/lib/ops/finance/import-preview";
import { previewParsedRows } from "@/lib/ops/finance/import-preview";
import type { FinanceImportSource, ParsedFinanceRow } from "@/lib/ops/finance/finance-model";
import { detectImportSource, parseFinanceFile } from "@/lib/ops/finance/parsers";
import {
  isAmazonOrderHistoryCsv,
  parseAmazonOrderHistoryCsv,
} from "@/lib/ops/finance/parsers/amazon-order-csv";
import { insertAmazonOrders } from "@/lib/ops/finance/db/amazon-orders";
import { parseNebatPdf } from "@/lib/ops/finance/parsers/nebat-pdf";
import { inspectQuery } from "@/lib/inspect/pg";

export type ImportReconciliation = {
  beginningBalance: number | null;
  endingBalance: number | null;
  computedActivity: number | null;
  difference: number | null;
  reconciled: boolean;
  statementStart: string | null;
  statementEnd: string | null;
};

export type ImportBatchPreview = {
  importId: number;
  fileName: string;
  source: FinanceImportSource;
  workflowStatus: string;
  rows: FinanceImportPreviewRow[];
  rowCount: number;
  duplicateCount: number;
  newCount: number;
  reconciliation: ImportReconciliation;
  note?: string;
  kind?: "checking" | "mortgage" | "orders";
};

function stagingToPreviewRows(staging: Awaited<ReturnType<typeof listImportStaging>>): FinanceImportPreviewRow[] {
  return staging.map((r) => ({
    stagingId: r.id,
    transactionDate: r.transactionDate,
    merchant: r.merchant,
    description: r.description,
    amount: r.amount,
    proposedAccount: r.proposedAccount,
    duplicateWarning: r.duplicateWarning,
    flowKind: r.flowKind,
  }));
}

async function storeNebatCheckingStatement(
  parsed: Awaited<ReturnType<typeof parseNebatPdf>> & { kind: "checking" },
  importId: number,
): Promise<void> {
  await inspectQuery(
    `INSERT INTO finance_nebat_statements
       (statement_start, statement_end, account_masked, beginning_balance, ending_balance,
        total_additions, total_subtractions, statement_type, raw_import_id, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'checking', $8, $9)
     ON CONFLICT (dedupe_key) DO UPDATE SET
       beginning_balance = EXCLUDED.beginning_balance,
       ending_balance = EXCLUDED.ending_balance,
       total_additions = EXCLUDED.total_additions,
       total_subtractions = EXCLUDED.total_subtractions`,
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
}

async function storeNebatMortgageStatement(
  parsed: Awaited<ReturnType<typeof parseNebatPdf>> & { kind: "mortgage" },
  importId: number,
): Promise<void> {
  await inspectQuery(
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
       escrow = EXCLUDED.escrow`,
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
}

function buildReconciliation(input: {
  beginningBalance: number | null;
  endingBalance: number | null;
  additions: number;
  subtractions: number;
  statementStart: string | null;
  statementEnd: string | null;
  reconciled?: boolean;
}): ImportReconciliation {
  const computedActivity = input.additions - input.subtractions;
  const difference =
    input.beginningBalance != null && input.endingBalance != null
      ? Number(
          (
            input.endingBalance -
            (input.beginningBalance + input.additions - input.subtractions)
          ).toFixed(2),
        )
      : null;
  return {
    beginningBalance: input.beginningBalance,
    endingBalance: input.endingBalance,
    computedActivity,
    difference,
    reconciled: input.reconciled ?? false,
    statementStart: input.statementStart,
    statementEnd: input.statementEnd,
  };
}

async function nebatRowsToParsed(
  parsed: Awaited<ReturnType<typeof parseNebatPdf>> & { kind: "checking" },
): Promise<ParsedFinanceRow[]> {
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
  return rows;
}

export async function parseAndStageUpload(input: {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<ImportBatchPreview> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");
  await ensureFinanceSchema();

  const isPdf = input.mimeType.includes("pdf") || input.fileName.toLowerCase().endsWith(".pdf");
  const content = isPdf ? "" : input.buffer.toString("utf8");
  const detected = isPdf ? ("nebat" as FinanceImportSource) : detectImportSource(input.fileName, content);

  const record = await createFinanceImport({
    source: detected,
    fileName: input.fileName,
    fileType: input.mimeType || "application/octet-stream",
    status: "parsing",
  });
  const storagePath = await saveImportFile(record.id, input.fileName, input.buffer);
  await clearImportStaging(record.id);

  const institution = await getInstitutionAccountForSource(detected);

  if (isPdf) {
    const parsed = await parseNebatPdf(input.buffer);
    if (parsed.kind === "mortgage") {
      await storeNebatMortgageStatement(parsed, record.id);
      const mortgageInst = await getInstitutionAccountForSource("nebat");
      await updateFinanceImport(record.id, {
        storagePath,
        status: "parsed",
        workflowStatus: "parsed",
        institutionAccountId: mortgageInst?.id ?? institution?.id ?? null,
        beginningBalance: null,
        endingBalance: parsed.outstandingPrincipal,
        computedActivity: null,
        balanceDifference: null,
        statementStart: parsed.statementDate,
        statementEnd: parsed.statementDate,
        errorMessage: null,
      });
      return {
        importId: record.id,
        fileName: input.fileName,
        source: "nebat",
        workflowStatus: "parsed",
        rows: [],
        rowCount: 0,
        duplicateCount: 0,
        newCount: 0,
        kind: "mortgage",
        note: "Mortgage statement stored. No ledger transactions to post.",
        reconciliation: buildReconciliation({
          beginningBalance: null,
          endingBalance: parsed.outstandingPrincipal,
          additions: 0,
          subtractions: 0,
          statementStart: parsed.statementDate,
          statementEnd: parsed.statementDate,
        }),
      };
    }

    await storeNebatCheckingStatement(parsed, record.id);
    const parsedRows = await nebatRowsToParsed(parsed);
    const rules = await listFinanceRules();
    const preview = await previewParsedRows(parsedRows, rules);
    const stagingPayload = parsedRows.map((row, i) => {
      const txn = parsed.transactions[i]!;
      return {
        ...row,
        proposedAccount: preview[i]?.proposedAccount ?? null,
        duplicateWarning: preview[i]?.duplicateWarning ?? null,
        reviewStatus: txn.reviewStatus,
        taxTreatment: txn.taxTreatment ?? null,
      };
    });
    await insertImportStaging(record.id, stagingPayload);
    const activity = computeStagingActivity(
      preview.map((p, i) => ({
        ...p,
        id: i,
        dedupeKey: parsedRows[i]!.dedupeKey,
        source: "nebat",
        accountId: null,
        taxTreatment: parsed.transactions[i]!.taxTreatment ?? null,
        reviewStatus: parsed.transactions[i]!.reviewStatus,
      })),
    );
    const reconciliation = buildReconciliation({
      beginningBalance: parsed.beginningBalance,
      endingBalance: parsed.endingBalance,
      additions: activity.additions,
      subtractions: activity.subtractions,
      statementStart: parsed.statementStart,
      statementEnd: parsed.statementEnd,
    });
    await updateFinanceImport(record.id, {
      storagePath,
      status: "parsed",
      workflowStatus: "parsed",
      institutionAccountId: institution?.id ?? null,
      beginningBalance: reconciliation.beginningBalance,
      endingBalance: reconciliation.endingBalance,
      computedActivity: reconciliation.computedActivity,
      balanceDifference: reconciliation.difference,
      statementStart: parsed.statementStart,
      statementEnd: parsed.statementEnd,
      transactionCount: preview.length,
      errorMessage: null,
    });
    return {
      importId: record.id,
      fileName: input.fileName,
      source: "nebat",
      workflowStatus: "parsed",
      rows: stagingToPreviewRows(await listImportStaging(record.id)),
      rowCount: preview.length,
      duplicateCount: preview.filter((r) => r.duplicateWarning).length,
      newCount: preview.filter((r) => !r.duplicateWarning).length,
      kind: "checking",
      reconciliation,
    };
  }

  if (detected === "amazon" && isAmazonOrderHistoryCsv(content)) {
    const orders = parseAmazonOrderHistoryCsv(content);
    const report = await insertAmazonOrders(orders, record.id);
    await updateFinanceImport(record.id, {
      storagePath,
      status: "parsed",
      workflowStatus: "posted",
      postedAt: new Date().toISOString(),
      transactionCount: report.itemsImported,
      transactionsInserted: report.itemsImported,
      transactionsSkipped: report.duplicatesSkipped,
      errorMessage: null,
    });
    return {
      importId: record.id,
      fileName: input.fileName,
      source: "amazon",
      workflowStatus: "posted",
      rows: [],
      rowCount: 0,
      duplicateCount: report.duplicatesSkipped,
      newCount: report.itemsImported,
      kind: "orders",
      note: "Amazon order detail stored in finance_amazon_orders — not posted to ledger.",
      reconciliation: buildReconciliation({
        beginningBalance: null,
        endingBalance: null,
        additions: 0,
        subtractions: 0,
        statementStart: null,
        statementEnd: null,
        reconciled: true,
      }),
    };
  }

  if (detected === "amazon") {
    await updateFinanceImport(record.id, {
      storagePath,
      status: "empty",
      workflowStatus: "parsed",
      errorMessage: "Amazon payment CSV is not imported to ledger. Use order history CSV or Amazon PDF import.",
    });
    throw new Error(
      "Amazon payment exports are not ledger sources. Import order history CSV or Amazon order PDFs in Import.",
    );
  }

  const parsed = parseFinanceFile(input.fileName, content, input.mimeType);
  const rules = await listFinanceRules();
  const preview = await previewParsedRows(parsed.rows, rules);
  const stagingPayload = parsed.rows.map((row, i) => ({
    ...row,
    proposedAccount: preview[i]?.proposedAccount ?? null,
    duplicateWarning: preview[i]?.duplicateWarning ?? null,
    reviewStatus: "pending",
  }));
  await insertImportStaging(record.id, stagingPayload);

  const activity = computeStagingActivity(
    preview.map((p, i) => ({
      ...p,
      id: i,
      dedupeKey: parsed.rows[i]!.dedupeKey,
      source: parsed.source,
      accountId: null,
      taxTreatment: null,
      reviewStatus: "pending",
    })),
  );

  const reconciliation = buildReconciliation({
    beginningBalance: null,
    endingBalance: null,
    additions: activity.additions,
    subtractions: activity.subtractions,
    statementStart: null,
    statementEnd: null,
  });

  await updateFinanceImport(record.id, {
    storagePath,
    status: preview.length ? "parsed" : "empty",
    workflowStatus: "parsed",
    institutionAccountId: institution?.id ?? null,
    computedActivity: reconciliation.computedActivity,
    transactionCount: preview.length,
    errorMessage: parsed.note ?? null,
  });

  return {
    importId: record.id,
    fileName: input.fileName,
    source: parsed.source,
    workflowStatus: "parsed",
    rows: stagingToPreviewRows(await listImportStaging(record.id)),
    rowCount: preview.length,
    duplicateCount: preview.filter((r) => r.duplicateWarning).length,
    newCount: preview.filter((r) => !r.duplicateWarning).length,
    note: parsed.note,
    reconciliation,
  };
}

export async function markImportReviewed(importId: number): Promise<FinanceImportRecord> {
  const imp = await getFinanceImport(importId);
  if (!imp) throw new Error("Import not found");
  if (imp.postedAt) throw new Error("Import already posted");
  await updateFinanceImport(importId, { workflowStatus: "reviewed" });
  const updated = await getFinanceImport(importId);
  if (!updated) throw new Error("Import not found");
  return updated;
}

export async function reconcileImport(importId: number): Promise<ImportReconciliation> {
  const imp = await getFinanceImport(importId);
  if (!imp) throw new Error("Import not found");
  if (imp.postedAt) throw new Error("Import already posted");

  const staging = await listImportStaging(importId);
  const activity = computeStagingActivity(staging);
  const reconciliation = buildReconciliation({
    beginningBalance: imp.beginningBalance,
    endingBalance: imp.endingBalance,
    additions: activity.additions,
    subtractions: activity.subtractions,
    statementStart: imp.statementStart,
    statementEnd: imp.statementEnd,
    reconciled: true,
  });

  await updateFinanceImport(importId, {
    workflowStatus: "reconciled",
    computedActivity: reconciliation.computedActivity,
    balanceDifference: reconciliation.difference,
    reconciledAt: new Date().toISOString(),
  });

  return reconciliation;
}

export async function postImportToLedger(importId: number): Promise<{
  inserted: number;
  skipped: number;
  updated: number;
  pending: number;
}> {
  const imp = await getFinanceImport(importId);
  if (!imp) throw new Error("Import not found");
  if (imp.postedAt) throw new Error("Import already posted");
  if (imp.workflowStatus !== "reconciled") {
    throw new Error("Import must be reconciled before posting");
  }

  const staging = await listImportStaging(importId);
  if (!staging.length) {
    await updateFinanceImport(importId, {
      workflowStatus: "posted",
      postedAt: new Date().toISOString(),
      status: "posted",
    });
    return { inserted: 0, skipped: 0, updated: 0, pending: 0 };
  }

  const rules = await listFinanceRules();
  const postedCount = staging.length;
  const result = await insertFinanceTransactions(
    stagingToParsedRows(staging),
    importId,
    rules,
    imp.institutionAccountId,
  );

  const countRows = await inspectQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM finance_transactions
     WHERE raw_import_id = $1 AND archived_at IS NULL`,
    [importId],
  );
  const ledgerCount = Number(countRows[0]?.count ?? 0);

  for (const row of staging) {
    if (!row.taxTreatment) continue;
    await inspectExecute(
      `UPDATE finance_transactions
       SET tax_treatment = $1, review_status = COALESCE(review_status, $2),
           institution_account_id = COALESCE(institution_account_id, $4)
       WHERE dedupe_key = $3 AND archived_at IS NULL`,
      [row.taxTreatment, row.reviewStatus, row.dedupeKey, imp.institutionAccountId],
    );
  }

  await updateFinanceImport(importId, {
    workflowStatus: "posted",
    postedAt: new Date().toISOString(),
    status: "posted",
    transactionsInserted: result.inserted,
    transactionsSkipped: result.skipped,
    transactionsUpdated: result.updated,
    transactionsPending: result.pending,
    transactionCount: ledgerCount,
    postedTransactionCount: ledgerCount,
  });

  await clearImportStaging(importId);
  return result;
}

export async function getImportBatch(importId: number): Promise<{
  import: FinanceImportRecord;
  rows: FinanceImportPreviewRow[];
  reconciliation: ImportReconciliation;
} | null> {
  const imp = await getFinanceImport(importId);
  if (!imp) return null;
  const staging = await listImportStaging(importId);
  const rows: FinanceImportPreviewRow[] = staging.map((r) => ({
    stagingId: r.id,
    transactionDate: r.transactionDate,
    merchant: r.merchant,
    description: r.description,
    amount: r.amount,
    proposedAccount: r.proposedAccount,
    duplicateWarning: r.duplicateWarning,
    flowKind: r.flowKind,
  }));
  return {
    import: imp,
    rows,
    reconciliation: {
      beginningBalance: imp.beginningBalance,
      endingBalance: imp.endingBalance,
      computedActivity: imp.computedActivity,
      difference: imp.balanceDifference,
      reconciled: Boolean(imp.reconciledAt),
      statementStart: imp.statementStart,
      statementEnd: imp.statementEnd,
    },
  };
}
