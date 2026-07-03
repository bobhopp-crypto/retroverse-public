/**
 * Stable list/event identities — assigned only when building or loading data models.
 * React components must consume `.id` from the model; never invent keys at render time.
 */

export type IdentifiedText = { id: string; text: string };

export type IdentifiedLabel = { id: string; label: string };

export function modelListItemId(scope: string, sequence: number, token?: string): string {
  const suffix = token?.replace(/\s+/g, "-").slice(0, 48) ?? "item";
  return `${scope}-${sequence}-${suffix}`;
}

export function identifyStrings(scope: string, items: readonly string[]): IdentifiedText[] {
  return items.map((text, sequence) => ({
    id: modelListItemId(scope, sequence, text),
    text,
  }));
}

export function identifyLabels(scope: string, items: readonly string[]): IdentifiedLabel[] {
  return items.map((label, sequence) => ({
    id: modelListItemId(scope, sequence, label),
    label,
  }));
}

export function ensureRowIds<T extends object>(
  scope: string,
  rows: T[],
  tokenFromRow?: (row: T, sequence: number) => string | undefined,
): Array<T & { id: string }> {
  return rows.map((row, sequence) => ({
    ...row,
    id:
      "id" in row && typeof row.id === "string" && row.id
        ? row.id
        : modelListItemId(scope, sequence, tokenFromRow?.(row, sequence)),
  }));
}
