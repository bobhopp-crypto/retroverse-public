/**
 * Display normalization for canonical_track_display titles on public pages.
 * Fixes systematic casing artifacts from upstream title-casing (apostrophe splits).
 * Does not rewrite merged titles or graph duplicates — those require data cleanup.
 */

/** Upstream title-casers often capitalize the letter after an apostrophe (It'S, Can'T). */
const APOSTROPHE_CAP_FIX = /'([A-Z])(?=\s|$)/g;

export function formatCanonicalTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(APOSTROPHE_CAP_FIX, (_, letter: string) => `'${letter.toLowerCase()}`);
}
