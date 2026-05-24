import "server-only";

/** How aggressively suggestions narrow as the query grows. */
export type SuggestionBreadthTier = "wide" | "medium" | "tight";

export function suggestionBreadthTier(queryLength: number): SuggestionBreadthTier {
  if (queryLength <= 6) return "wide";
  if (queryLength <= 10) return "medium";
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
    return { maxTotal: 30, artists: 10, songs: 10, albums: 10, years: 3 };
  }
  if (tier === "medium") {
    return { maxTotal: 24, artists: 8, songs: 8, albums: 6, years: 3 };
  }
  return { maxTotal: 16, artists: 6, songs: 5, albums: 4, years: 2 };
}

/** Use canonical upstream / entity collapse only when the query is long enough. */
export function shouldUseCanonicalSuggestionContext(query: string): boolean {
  return query.trim().length >= 10;
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
  const wordContains = words.some((w) => w.includes(q));
  const titleStarts = t.startsWith(q);

  if (wordStarts || titleStarts) {
    if (tier === "wide") return 2;
    if (tier === "medium") return 1;
    return 0;
  }

  if (wordContains || t.includes(q)) {
    if (tier === "wide") return 5;
    if (tier === "medium") return 4;
    return 3;
  }

  if (tier !== "tight") {
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && tokens.every((tok) => t.includes(tok))) return 6;
  }

  const minSubseq = tier === "wide" ? 2 : 3;
  if (q.length >= minSubseq && hasOrbitSubsequence(t, q)) {
    if (tier === "wide") return 8;
    if (tier === "medium") return 9;
    return 10;
  }

  if (tier === "wide") return 40;
  if (tier === "medium") return 45;

  return 50;
}

/** Whether a label is weak enough to drop in tight discovery mode. */
export function isDiscoverableSuggestion(
  label: string,
  query: string,
  tier: SuggestionBreadthTier = suggestionBreadthTier(query.trim().length),
): boolean {
  if (tier === "wide" || tier === "medium") return true;
  return discoveryMatchScore(label, query, tier) < 50;
}

/** Loose in-order character match — keeps fuzzy orbit (e.g. el → shelton). */
function hasOrbitSubsequence(text: string, query: string): boolean {
  if (query.length < 2) return false;
  let ti = 0;
  for (let qi = 0; qi < query.length; qi += 1) {
    const idx = text.indexOf(query[qi], ti);
    if (idx < 0) return false;
    ti = idx + 1;
  }
  return true;
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
