const FEATURED_CREDIT = /\s+[([]?\s*(?:feat\.?|ft\.?|featuring)\s/i;

/** Full credit first, then the primary artist before a feat/ft/featuring credit. */
export function artistCreditLookupNames(name: string): string[] {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return [];
  const match = FEATURED_CREDIT.exec(clean);
  if (!match) return [clean];
  const primary = clean
    .slice(0, match.index)
    .replace(/[\s,;/\-()]+$/g, "")
    .trim();
  if (!primary || primary.toLowerCase() === clean.toLowerCase()) return [clean];
  return [clean, primary];
}
