/** RVER era ID from 4-year block start year: RVER00{startYear} */
export function rverIdFromStartYear(startYear: number): string {
  return `RVER00${startYear}`;
}

export function parseYearRange(slug: string): { start: number; end: number } | null {
  const m = /^(\d{4})-(\d{4})$/.exec(slug.trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return { start, end };
}
