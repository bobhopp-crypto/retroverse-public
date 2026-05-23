import "server-only";

/** How aggressively suggestions narrow as the query grows. */
export type SuggestionBreadthTier = "wide" | "medium" | "tight";

export function suggestionBreadthTier(queryLength: number): SuggestionBreadthTier {
  if (queryLength <= 3) return "wide";
  if (queryLength <= 5) return "medium";
  return "tight";
}

export type SuggestionSlotLimits = {
  maxTotal: number;
  artists: number;
  songs: number;
  albums: number;
  years: number;
};

export function suggestionSlotLimits(queryLength: number): SuggestionSlotLimits {
  const tier = suggestionBreadthTier(queryLength);
  if (tier === "wide") {
    return { maxTotal: 14, artists: 5, songs: 4, albums: 4, years: 2 };
  }
  if (tier === "medium") {
    return { maxTotal: 12, artists: 4, songs: 3, albums: 3, years: 2 };
  }
  return { maxTotal: 8, artists: 4, songs: 2, albums: 2, years: 2 };
}

/** Use canonical upstream / entity collapse only when the query is long enough. */
export function shouldUseCanonicalSuggestionContext(query: string): boolean {
  return query.trim().length >= 6;
}

function norm(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Discovery-oriented match score (lower = better).
 * Wide tier: word-start and contains weigh similarly — avoid locking to one entity.
 * Tight tier: prefix / exact matches rise.
 */
export function discoveryMatchScore(
  text: string,
  query: string,
  tier: SuggestionBreadthTier = suggestionBreadthTier(query.trim().length),
): number {
  const t = norm(text);
  const q = norm(query);
  if (!t || !q) return 99;
  if (t === q) return 0;

  const words = t.split(/\s+/).filter(Boolean);
  const wordStarts = words.some((w) => w.startsWith(q));
  const titleStarts = t.startsWith(q);

  if (wordStarts || titleStarts) {
    if (tier === "wide") return 2;
    if (tier === "medium") return 1;
    return 0;
  }

  if (t.includes(q)) {
    if (tier === "wide") return 6;
    if (tier === "medium") return 4;
    return 3;
  }

  if (tier !== "tight") {
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && tokens.every((tok) => t.includes(tok))) return 5;
  }

  return 50;
}

/** Whether upstream should use PG-resolved artist name vs raw query text. */
export function upstreamQueryForSuggestions(
  rawQuery: string,
  canonicalName: string | null,
): string {
  const q = rawQuery.trim();
  if (!q) return q;
  if (!shouldUseCanonicalSuggestionContext(q) || !canonicalName?.trim()) return q;

  const key = norm(q).replace(/^the\s+/, "");
  const canonKey = norm(canonicalName).replace(/^the\s+/, "");
  if (key === canonKey) return canonicalName;
  if (key.length >= 4 && (canonKey.startsWith(key) || key.startsWith(canonKey))) {
    return canonicalName;
  }
  return q;
}
