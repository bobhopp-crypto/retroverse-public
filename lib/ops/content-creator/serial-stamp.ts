/** Pass serial labels composited into the back stamp zone at export. */

export type SerialFormat = "fraction" | "number";

export function formatPassSerial(index: number, total: number, format: SerialFormat = "fraction"): string {
  const width = Math.max(3, String(total).length);
  const n = String(index).padStart(width, "0");
  const t = String(total).padStart(width, "0");
  if (format === "number") return `No. ${n}`;
  return `${n} / ${t}`;
}

export const PRINT_QUANTITY_PRESETS = [12, 24, 36] as const;

export function normalizePrintQuantity(value: unknown, fallback = 12): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.max(1, Math.floor(n)), 999);
}

export function sheetCountForQuantity(quantity: number): number {
  return Math.ceil(quantity / 12);
}
