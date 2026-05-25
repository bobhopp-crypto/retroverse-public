/** Lowercase index key for deterministic entity search (no server-only). */

export function normalizeSearchLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchQueryTokens(query: string): string[] {
  const norm = normalizeSearchLabel(query);
  if (!norm) return [];
  return norm.split(" ").filter((t) => t.length > 0);
}

export function slugFromNormalizedLabel(label: string): string {
  return normalizeSearchLabel(label).replace(/\s+/g, "-");
}
