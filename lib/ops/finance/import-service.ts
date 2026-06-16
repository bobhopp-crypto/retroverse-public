import { inspectPing } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  createFinanceImport,
  saveImportFile,
  updateFinanceImport,
} from "@/lib/ops/finance/db/imports";
import { listFinanceRules } from "@/lib/ops/finance/db/rules";
import { insertFinanceTransactions } from "@/lib/ops/finance/db/transactions";
import type { FinanceImportSource } from "@/lib/ops/finance/finance-model";
import { detectImportSource, parseFinanceFile } from "@/lib/ops/finance/parsers";
import {
  isAmazonOrderHistoryCsv,
  parseAmazonOrderHistoryCsv,
} from "@/lib/ops/finance/parsers/amazon-order-csv";
import { insertAmazonOrders } from "@/lib/ops/finance/db/amazon-orders";

export type ImportFileResult = {
  fileName: string;
  source: FinanceImportSource;
  importId: number;
  inserted: number;
  skipped: number;
  updated: number;
  autoCategorized: number;
  pending: number;
  status: string;
  note?: string;
};

export async function processFinanceUpload(input: {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<ImportFileResult> {
  const ping = await inspectPing();
  if (!ping.ok) {
    throw new Error("Postgres unavailable — cannot import transactions");
  }
  await ensureFinanceSchema();

  const content = input.buffer.toString("utf8");
  const detected = detectImportSource(input.fileName, content);
  const record = await createFinanceImport({
    source: detected,
    fileName: input.fileName,
    fileType: input.mimeType || "application/octet-stream",
    status: "parsing",
  });

  const storagePath = await saveImportFile(record.id, input.fileName, input.buffer);

  const isBinary =
    input.mimeType.includes("pdf") ||
    input.mimeType.startsWith("image/") ||
    /\.(pdf|png|jpe?g|xlsx)$/i.test(input.fileName);

  if (isBinary && !input.fileName.toLowerCase().endsWith(".csv")) {
    await updateFinanceImport(record.id, {
      storagePath,
      status: "stored",
      transactionCount: 0,
      errorMessage: "Stored for reference — use Amazon PDF import or CSV export",
    });
    return {
      fileName: input.fileName,
      source: detected,
      importId: record.id,
      inserted: 0,
      skipped: 0,
      updated: 0,
      autoCategorized: 0,
      pending: 0,
      status: "stored",
      note: "PDF/image/XLSX stored. Use /ops/finance/import-amazon for Amazon Order History CSV or Apple Card for charges.",
    };
  }

  const parsed = parseFinanceFile(input.fileName, content, input.mimeType);
  const rules = await listFinanceRules();
  const result = await insertFinanceTransactions(parsed.rows, record.id, rules);

  if (parsed.source === "amazon" && isAmazonOrderHistoryCsv(content)) {
    const orders = parseAmazonOrderHistoryCsv(content);
    await insertAmazonOrders(orders, record.id);
  }

  await updateFinanceImport(record.id, {
    storagePath,
    status: parsed.rows.length ? "parsed" : "empty",
    transactionCount: result.inserted,
    transactionsInserted: result.inserted,
    transactionsSkipped: result.skipped,
    transactionsUpdated: result.updated,
    transactionsPending: result.pending,
    errorMessage: parsed.note ?? null,
  });

  return {
    fileName: input.fileName,
    source: parsed.source,
    importId: record.id,
    inserted: result.inserted,
    skipped: result.skipped,
    updated: result.updated,
    autoCategorized: result.autoCategorized,
    pending: result.pending,
    status: parsed.rows.length ? "parsed" : "empty",
    note: parsed.note,
  };
}
