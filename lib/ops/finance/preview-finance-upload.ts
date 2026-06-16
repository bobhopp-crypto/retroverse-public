import { inspectPing } from "@/lib/inspect/pg";

import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { listFinanceRules } from "@/lib/ops/finance/db/rules";
import type { FinanceImportSource } from "@/lib/ops/finance/finance-model";
import { detectImportSource, parseFinanceFile } from "@/lib/ops/finance/parsers";
import { previewParsedRows, type FinanceImportPreviewRow } from "@/lib/ops/finance/import-preview";

export type FinanceImportPreviewResult = {
  fileName: string;
  source: FinanceImportSource;
  rows: FinanceImportPreviewRow[];
  rowCount: number;
  duplicateCount: number;
  newCount: number;
  status: "preview" | "stored" | "empty";
  note?: string;
};

export async function previewFinanceUpload(input: {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<FinanceImportPreviewResult> {
  const ping = await inspectPing();
  if (!ping.ok) {
    throw new Error("Postgres unavailable — cannot preview import");
  }
  await ensureFinanceSchema();

  const content = input.buffer.toString("utf8");
  const detected = detectImportSource(input.fileName, content);

  const isBinary =
    input.mimeType.includes("pdf") ||
    input.mimeType.startsWith("image/") ||
    /\.(pdf|png|jpe?g|xlsx)$/i.test(input.fileName);

  if (isBinary && !input.fileName.toLowerCase().endsWith(".csv")) {
    return {
      fileName: input.fileName,
      source: detected,
      rows: [],
      rowCount: 0,
      duplicateCount: 0,
      newCount: 0,
      status: "stored",
      note: "Binary file — use Amazon PDF import or NEBAT PDF import. CSV can be previewed here.",
    };
  }

  const parsed = parseFinanceFile(input.fileName, content, input.mimeType);
  const rules = await listFinanceRules();
  const rows = await previewParsedRows(parsed.rows, rules);
  const duplicateCount = rows.filter((r) => r.duplicateWarning).length;

  return {
    fileName: input.fileName,
    source: parsed.source,
    rows,
    rowCount: rows.length,
    duplicateCount,
    newCount: rows.length - duplicateCount,
    status: rows.length ? "preview" : "empty",
    note: parsed.note,
  };
}
