import { inspectPing } from "@/lib/inspect/pg";

import { insertAmazonOrders } from "@/lib/ops/finance/db/amazon-orders";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  createFinanceImport,
  saveImportFile,
  updateFinanceImport,
} from "@/lib/ops/finance/db/imports";
import type { FinanceAmazonImportReport } from "@/lib/ops/finance/finance-canonical-model";
import {
  isAmazonOrderHistoryCsv,
  parseAmazonOrderHistoryCsv,
} from "@/lib/ops/finance/parsers/amazon-order-csv";
import { parseAmazonOrderPdf } from "@/lib/ops/finance/parsers/amazon-pdf";

export type AmazonImportResult = {
  fileName: string;
  importId: number;
  report: FinanceAmazonImportReport;
  format: "pdf" | "csv";
};

export async function processAmazonUpload(input: {
  fileName: string;
  buffer: Buffer;
}): Promise<AmazonImportResult> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  await ensureFinanceSchema();

  const lower = input.fileName.toLowerCase();
  const isCsv = lower.endsWith(".csv") || lower.endsWith(".txt");
  const isPdf = lower.endsWith(".pdf");

  if (!isCsv && !isPdf) {
    throw new Error("Upload a CSV (Order History Report) or PDF");
  }

  const record = await createFinanceImport({
    source: "amazon",
    fileName: input.fileName,
    fileType: isCsv ? "text/csv" : "application/pdf",
    status: "parsing",
  });

  const storagePath = await saveImportFile(record.id, input.fileName, input.buffer);

  let orders;
  let format: "pdf" | "csv";
  if (isCsv) {
    const content = input.buffer.toString("utf8");
    if (!isAmazonOrderHistoryCsv(content)) {
      throw new Error(
        "CSV missing Order ID / Order Date / Title columns. Request Amazon Order History Report from Your Account → Order History Reports.",
      );
    }
    orders = parseAmazonOrderHistoryCsv(content);
    format = "csv";
  } else {
    orders = await parseAmazonOrderPdf(input.buffer);
    format = "pdf";
  }

  const report = await insertAmazonOrders(orders, record.id);

  await updateFinanceImport(record.id, {
    storagePath,
    status: report.ordersImported ? "parsed" : "empty",
    transactionCount: report.itemsImported,
    transactionsInserted: report.itemsImported,
    transactionsSkipped: report.duplicatesSkipped,
    errorMessage: report.ordersImported ? null : "No orders found in file",
  });

  return { fileName: input.fileName, importId: record.id, report, format };
}

/** @deprecated Use processAmazonUpload */
export async function processAmazonPdfUpload(input: {
  fileName: string;
  buffer: Buffer;
}): Promise<AmazonImportResult> {
  return processAmazonUpload(input);
}
