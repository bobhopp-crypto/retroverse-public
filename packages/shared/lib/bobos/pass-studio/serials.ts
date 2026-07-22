import type { PassBatchRow } from "./types";

/** Zero-padded serial, e.g. 7 → "0007". */
export function padSerial(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(4, "0");
}

/** Permanent public Retroverse credential identity, e.g. 163 → RVSN000163. */
export function formatRetroverseSerial(n: number): string {
  return `RVSN${String(Math.max(0, Math.floor(n))).padStart(6, "0")}`;
}

export type DraftBatchRow = {
  id: string;
  passType: string;
  quantity: number;
  templateId?: string;
};

/** Serial numbers continue across every pass type, starting at `startAt` (default 1). */
export function computeBatchRows(rows: DraftBatchRow[], startAt = 1): PassBatchRow[] {
  let next = Math.max(1, Math.floor(startAt) || 1);
  return rows.map((row) => {
    const quantity = Math.max(0, Math.floor(row.quantity) || 0);
    const firstSerial = quantity > 0 ? next : next;
    const lastSerial = quantity > 0 ? next + quantity - 1 : next - 1;
    next += quantity;
    return {
      id: row.id,
      passType: row.passType,
      quantity,
      firstSerial,
      lastSerial,
      templateId: row.templateId,
    };
  });
}

export function totalPassesForRows(rows: { quantity: number }[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, Math.floor(row.quantity) || 0), 0);
}

export function serialRangeForRows(rows: PassBatchRow[]): { start: number; end: number } {
  const withQuantity = rows.filter((row) => row.quantity > 0);
  if (withQuantity.length === 0) return { start: 0, end: 0 };
  return {
    start: withQuantity[0]!.firstSerial,
    end: withQuantity[withQuantity.length - 1]!.lastSerial,
  };
}
