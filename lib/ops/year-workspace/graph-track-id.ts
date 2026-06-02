/** Postgres `tracks.id` may arrive as string — normalize for Set lookups and keys. */
export function normalizeGraphTrackId(
  value: number | string | null | undefined,
): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}
