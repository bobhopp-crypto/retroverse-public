/** Deterministic title key for album-slot matching (no server-only). */

export function normalizeTrackTitleKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titlesLikelyMatch(a: string, b: string): boolean {
  const ka = normalizeTrackTitleKey(a);
  const kb = normalizeTrackTitleKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  return false;
}
