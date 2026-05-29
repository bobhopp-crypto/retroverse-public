/** Ensure React row keys stay unique when upstream ids collide. */
export function ensureUniqueRowIds<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const base = row.id?.trim() || "row";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (n === 0) return row;
    return { ...row, id: `${base}--${n}` };
  });
}
