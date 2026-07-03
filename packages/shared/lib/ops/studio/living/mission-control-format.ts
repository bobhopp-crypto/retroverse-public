/** Safe display helpers for Mission Control metrics (never throw on missing data). */

export function safeMetricCount(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

export function formatMetricCount(value: number | null | undefined): string {
  return safeMetricCount(value).toLocaleString();
}

export function formatMetricText(value: string | null | undefined, fallback = "—"): string {
  if (value == null) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function sumMetricCounts(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const value of values) {
    total += safeMetricCount(value);
  }
  return total;
}
