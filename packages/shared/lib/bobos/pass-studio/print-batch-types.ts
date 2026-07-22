/**
 * Design Builder Print Production — traceable batch + serial records.
 *
 * A Print Batch is created every time Design Builder generates a production run of passes.
 * It never replaces `PassBatch` (pass-studio/types.ts) — it adds production/print
 * traceability on top: paper size, physical pass size, sheet layout, sheet counts, and a
 * printed/void lifecycle. `PrintBatch.id` is always the same id as the underlying
 * `PassBatch.id` so every finished render file on disk stays keyed the same way it always
 * has — no file paths change.
 */

export type PrintLayoutId = "2up" | "4up" | "8up" | "16up";

export type PrintBatchPassTypeCount = {
  passType: string;
  quantity: number;
  firstSerial: number;
  lastSerial: number;
};

export type PrintBatchStatus = "draft" | "ready_to_print" | "printed" | "void";

export type PrintBatch = {
  /** Same value as `PassBatch.id` — the shared key for every render file this batch owns. */
  id: string;
  /** Human-friendly sequential code shown to operators, e.g. "DB-00018". */
  displayId: string;
  eventId: string;
  eventName: string;
  passTypeCounts: PrintBatchPassTypeCount[];
  serialStart: number;
  serialEnd: number;
  totalPasses: number;
  paperSize: { widthIn: number; heightIn: number };
  passSize: { widthIn: number; heightIn: number };
  /** Null until sheets have been built at least once in the Print step. */
  layout: PrintLayoutId | null;
  frontSheetCount: number;
  backSheetCount: number;
  status: PrintBatchStatus;
  createdAt: string;
  updatedAt: string;
  printedAt: string | null;
};

export type PrintBatchesFile = {
  version: 1;
  batches: PrintBatch[];
};

/** Per-serial traceability — one record per printed credential, independent of the
 *  pass-studio Pass Library (which already tracks artwork + registration state). This is
 *  the production paper trail: was it reserved, printed, claimed, or voided. */
export type SerialRecordStatus = "reserved" | "printed" | "registered" | "void";

export type SerialRecord = {
  serial: string;
  batchId: string;
  eventId: string;
  passType: string;
  qrUrl: string;
  status: SerialRecordStatus;
  createdAt: string;
  printedAt: string | null;
};

export type SerialRecordsFile = {
  version: 1;
  records: SerialRecord[];
};
