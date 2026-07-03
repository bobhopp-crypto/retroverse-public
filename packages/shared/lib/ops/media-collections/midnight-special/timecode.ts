export function secToTimecode(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function parseDescriptionTimecode(line: string): number | null {
  const m = line.match(/^(\d{2}):(\d{2}):(\d{2})\b/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3]);
  if (![h, min, s].every(Number.isFinite)) return null;
  return h * 3600 + min * 60 + s;
}

export function parseYearFromAirDate(airDate?: string): number | undefined {
  if (!airDate?.trim()) return undefined;
  const m = airDate.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}
