import type { PassBatchRow } from "./types";
import type { GeneratedPass, PassRegistration } from "./types";
import {
  normalizePassSerial,
  type NormalizedPassSerial,
} from "@/lib/retroverse-pass/types";

export { normalizePassSerial };

export function passMatchesNormalizedSerial(
  pass: { serial: string; serialNumber: number },
  normalized: NormalizedPassSerial,
): boolean {
  if (Number.isSafeInteger(pass.serialNumber) && pass.serialNumber === normalized.number) {
    return true;
  }

  return normalizePassSerial(pass.serial)?.number === normalized.number;
}

export type ExactPassResolution<T> =
  | { state: "found"; pass: T }
  | { state: "not_found" }
  | { state: "ambiguous" };

export function resolveExactPass<T extends { serial: string; serialNumber: number }>(
  passes: T[],
  normalized: NormalizedPassSerial,
): ExactPassResolution<T> {
  const matches = passes.filter((pass) => passMatchesNormalizedSerial(pass, normalized));
  if (matches.length === 0) return { state: "not_found" };
  if (matches.length > 1) return { state: "ambiguous" };
  return { state: "found", pass: matches[0]! };
}

export function findPassIndexById(passes: { id: string }[], passId: string): number {
  return passes.findIndex((pass) => pass.id === passId);
}

export function applyRegistrationById(
  passes: GeneratedPass[],
  passId: string,
  registration: PassRegistration,
): { passes: GeneratedPass[]; pass: GeneratedPass } | null {
  const index = findPassIndexById(passes, passId);
  if (index === -1) return null;

  const existing = passes[index]!;
  if (existing.status === "registered" && existing.registration) {
    return { passes, pass: existing };
  }

  const pass: GeneratedPass = { ...existing, status: "registered", registration };
  const next = [...passes];
  next[index] = pass;
  return { passes: next, pass };
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
