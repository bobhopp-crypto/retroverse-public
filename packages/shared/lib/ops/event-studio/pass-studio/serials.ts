import type { PassBatchRow } from "./types";

export type NormalizedPassSerial = {
  number: number;
};

/**
 * Convert every public serial still in circulation to its stable numeric identity.
 * Accepted examples: RVSN500, RVSN-500, rvsn500, 500, and legacy 0500.
 */
export function normalizePassSerial(raw: string): NormalizedPassSerial | null {
  const value = raw.trim();
  const match = /^(?:RVSN-?)?(\d+)$/i.exec(value);
  if (!match) return null;

  const number = Number(match[1]);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return { number };
}

export function passMatchesNormalizedSerial(
  pass: { serial: string; serialNumber: number },
  normalized: NormalizedPassSerial,
): boolean {
  if (Number.isSafeInteger(pass.serialNumber) && pass.serialNumber === normalized.number) {
    return true;
  }

  return normalizePassSerial(pass.serial)?.number === normalized.number;
}

/** Zero-padded serial, e.g. 7 → "0007". */
export function padSerial(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(4, "0");
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
