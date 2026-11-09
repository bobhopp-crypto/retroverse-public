export function normalizeVdjYear(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= 2100 ? value : null;
}
