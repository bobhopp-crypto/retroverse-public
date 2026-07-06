import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { PASS_PRINT_HEIGHT_IN, PASS_PRINT_WIDTH_IN } from "@/lib/ops/creative-lab/pass-layout";
import {
  BOBOS_PRINT_SHEET_HEIGHT_IN,
  BOBOS_PRINT_SHEET_WIDTH_IN,
} from "@/lib/bobos/project-zero/print-sheet-grid";
import { opsStateDir } from "@/lib/ops/ops-state-path";

import type {
  PrintBatch,
  PrintBatchesFile,
  PrintBatchPassTypeCount,
  PrintLayoutId,
  SerialRecord,
  SerialRecordsFile,
} from "./print-batch-types";

function printBatchDir(): string {
  return join(opsStateDir(), "event-studio", "pass-studio");
}

function printBatchesPath(): string {
  return join(printBatchDir(), "print-batches.json");
}

function serialRecordsPath(): string {
  return join(printBatchDir(), "serial-records.json");
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(path: string, value: T): Promise<void> {
  await mkdir(printBatchDir(), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// ── Print batches ──────────────────────────────────────────

export async function loadPrintBatches(): Promise<PrintBatch[]> {
  const file = await readJsonFile<PrintBatchesFile>(printBatchesPath(), { version: 1, batches: [] });
  return file.batches;
}

async function saveAllPrintBatches(batches: PrintBatch[]): Promise<void> {
  await writeJsonFile<PrintBatchesFile>(printBatchesPath(), { version: 1, batches });
}

export async function savePrintBatch(batch: PrintBatch): Promise<void> {
  const batches = await loadPrintBatches();
  const next = [batch, ...batches.filter((b) => b.id !== batch.id)];
  await saveAllPrintBatches(next);
}

export async function findPrintBatch(id: string): Promise<PrintBatch | null> {
  const batches = await loadPrintBatches();
  return batches.find((b) => b.id === id) ?? null;
}

export async function listPrintBatchesForEvent(eventId: string): Promise<PrintBatch[]> {
  const batches = await loadPrintBatches();
  return batches.filter((b) => b.eventId === eventId);
}

function padBatchNumber(n: number): string {
  return String(Math.max(0, n)).padStart(5, "0");
}

/** Sequential, human-friendly batch code — "DB-00018". Never reused, even if a batch is later voided. */
async function nextPrintBatchDisplayId(): Promise<string> {
  const batches = await loadPrintBatches();
  return `DB-${padBatchNumber(batches.length + 1)}`;
}

export type CreatePrintBatchInput = {
  /** Must match the underlying `PassBatch.id` — never a new id. */
  id: string;
  eventId: string;
  eventName: string;
  passTypeCounts: PrintBatchPassTypeCount[];
  serialStart: number;
  serialEnd: number;
  totalPasses: number;
};

/** Called once, right when Design Builder finishes generating a batch's artwork. */
export async function createPrintBatch(input: CreatePrintBatchInput): Promise<PrintBatch> {
  const now = new Date().toISOString();
  const displayId = await nextPrintBatchDisplayId();
  const batch: PrintBatch = {
    id: input.id,
    displayId,
    eventId: input.eventId,
    eventName: input.eventName,
    passTypeCounts: input.passTypeCounts,
    serialStart: input.serialStart,
    serialEnd: input.serialEnd,
    totalPasses: input.totalPasses,
    paperSize: { widthIn: BOBOS_PRINT_SHEET_WIDTH_IN, heightIn: BOBOS_PRINT_SHEET_HEIGHT_IN },
    passSize: { widthIn: PASS_PRINT_WIDTH_IN, heightIn: PASS_PRINT_HEIGHT_IN },
    layout: null,
    frontSheetCount: 0,
    backSheetCount: 0,
    status: "ready_to_print",
    createdAt: now,
    updatedAt: now,
    printedAt: null,
  };
  await savePrintBatch(batch);
  return batch;
}

/** Called every time the Print step (re)builds sheets for a chosen layout. */
export async function updatePrintBatchLayout(
  batchId: string,
  layout: PrintLayoutId,
  frontSheetCount: number,
  backSheetCount: number,
): Promise<PrintBatch> {
  const batch = await findPrintBatch(batchId);
  if (!batch) throw new Error("Print batch not found.");
  const updated: PrintBatch = {
    ...batch,
    layout,
    frontSheetCount,
    backSheetCount,
    updatedAt: new Date().toISOString(),
  };
  await savePrintBatch(updated);
  return updated;
}

/** Explicit operator action only — never flips automatically when the print dialog opens. */
export async function markPrintBatchPrinted(batchId: string): Promise<PrintBatch> {
  const batch = await findPrintBatch(batchId);
  if (!batch) throw new Error("Print batch not found.");
  const now = new Date().toISOString();
  const updated: PrintBatch = { ...batch, status: "printed", printedAt: now, updatedAt: now };
  await savePrintBatch(updated);
  await markSerialRecordsPrintedForBatch(batchId, now);
  return updated;
}

export async function voidPrintBatch(batchId: string): Promise<PrintBatch> {
  const batch = await findPrintBatch(batchId);
  if (!batch) throw new Error("Print batch not found.");
  const updated: PrintBatch = { ...batch, status: "void", updatedAt: new Date().toISOString() };
  await savePrintBatch(updated);
  return updated;
}

// ── Serial records ─────────────────────────────────────────

export async function loadSerialRecords(): Promise<SerialRecord[]> {
  const file = await readJsonFile<SerialRecordsFile>(serialRecordsPath(), { version: 1, records: [] });
  return file.records;
}

async function saveAllSerialRecords(records: SerialRecord[]): Promise<void> {
  await writeJsonFile<SerialRecordsFile>(serialRecordsPath(), { version: 1, records });
}

export type ReserveSerialRecordInput = {
  serial: string;
  batchId: string;
  eventId: string;
  passType: string;
  qrUrl: string;
};

/** Reserves one record per serial in a freshly generated batch — never overwrites an existing serial. */
export async function reserveSerialRecords(inputs: ReserveSerialRecordInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const existing = await loadSerialRecords();
  const existingSerials = new Set(existing.map((r) => r.serial));
  const now = new Date().toISOString();
  const additions: SerialRecord[] = inputs
    .filter((input) => !existingSerials.has(input.serial))
    .map((input) => ({
      serial: input.serial,
      batchId: input.batchId,
      eventId: input.eventId,
      passType: input.passType,
      qrUrl: input.qrUrl,
      status: "reserved",
      createdAt: now,
      printedAt: null,
    }));
  if (additions.length === 0) return;
  await saveAllSerialRecords([...existing, ...additions]);
}

export async function findSerialRecord(serial: string): Promise<SerialRecord | null> {
  const records = await loadSerialRecords();
  return records.find((r) => r.serial === serial) ?? null;
}

export async function listSerialRecordsForBatch(batchId: string): Promise<SerialRecord[]> {
  const records = await loadSerialRecords();
  return records.filter((r) => r.batchId === batchId);
}

async function markSerialRecordsPrintedForBatch(batchId: string, printedAt: string): Promise<void> {
  const records = await loadSerialRecords();
  let changed = false;
  const next = records.map((record) => {
    if (record.batchId !== batchId) return record;
    // Never downgrade a serial that's already been claimed or voided.
    if (record.status === "registered" || record.status === "void") return record;
    changed = true;
    return { ...record, status: "printed" as const, printedAt };
  });
  if (changed) await saveAllSerialRecords(next);
}

/**
 * Best-effort mirror called from the existing pass registration flow — records that a
 * printed serial has now been claimed. Never throws: registration must never fail because
 * this traceability write failed.
 */
export async function markSerialRecordRegistered(serial: string): Promise<void> {
  try {
    const records = await loadSerialRecords();
    const index = records.findIndex((r) => r.serial === serial);
    if (index === -1) return;
    if (records[index]!.status === "registered") return;
    const next = [...records];
    next[index] = { ...next[index]!, status: "registered" };
    await saveAllSerialRecords(next);
  } catch {
    // Never block registration on a traceability failure.
  }
}
