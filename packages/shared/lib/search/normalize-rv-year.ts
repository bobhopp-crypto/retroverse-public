/** Canonical RetroVerse year normalization for search + RV History. */

export const MIN_RV_YEAR = 1950;
export const MAX_RV_YEAR = 2035;

const FOUR_DIGIT_YEAR = /\b(19[5-9]\d|20[0-3]\d)\b/g;
const TWO_DIGIT_YEAR = /\b(\d{2})\b/g;

export function inRvYearRange(year: number): boolean {
  return year >= MIN_RV_YEAR && year <= MAX_RV_YEAR;
}

/** 50–99 → 1950–1999; 00–29 → 2000–2029; 30–49 → 1930–1949. */
export function resolveTwoDigitRvYear(twoDigit: number): number {
  if (twoDigit >= 50 && twoDigit <= 99) return 1900 + twoDigit;
  if (twoDigit >= 0 && twoDigit <= 29) return 2000 + twoDigit;
  return 1900 + twoDigit;
}

/**
 * Normalize any year token to a full RV year (e.g. 78 → 1978, "1984" → 1984).
 * Returns null when not a recognizable RV year.
 */
export function normalizeRVYear(input: unknown): number | null {
  if (input == null) return null;

  if (typeof input === "number" && Number.isFinite(input)) {
    const n = Math.trunc(input);
    if (inRvYearRange(n)) return n;
    if (n >= 0 && n <= 99) {
      const resolved = resolveTwoDigitRvYear(n);
      return inRvYearRange(resolved) ? resolved : null;
    }
    return null;
  }

  if (typeof input === "string") {
    const token = input.trim();
    if (!token) return null;
    if (/^(19[5-9]\d|20[0-3]\d)$/.test(token)) {
      const y = Number(token);
      return inRvYearRange(y) ? y : null;
    }
    if (/^\d{2}$/.test(token)) {
      const y = resolveTwoDigitRvYear(Number(token));
      return inRvYearRange(y) ? y : null;
    }
  }

  return null;
}

/** Query text with RV year tokens removed (for artist name resolution). */
export function stripYearTokensFromQuery(query: string): string {
  const normalized = query.trim().replace(/\+/g, " ");
  let scratch = ` ${normalized} `;

  scratch = scratch.replace(FOUR_DIGIT_YEAR, " ");
  scratch = scratch.replace(TWO_DIGIT_YEAR, " ");

  return scratch.replace(/\s+/g, " ").trim();
}

export type YearContext = {
  hasYear: boolean;
  rvYear: number | null;
  years: number[];
};

function collectYearTokens(query: string): { index: number; year: number }[] {
  const normalized = query.trim().replace(/\+/g, " ");
  const found: { index: number; year: number }[] = [];
  let scratch = ` ${normalized} `;

  for (const match of normalized.matchAll(FOUR_DIGIT_YEAR)) {
    const year = normalizeRVYear(match[1]);
    if (year == null) continue;
    found.push({ index: match.index ?? 0, year });
    scratch = scratch.replace(match[0], " ");
  }

  for (const match of scratch.matchAll(TWO_DIGIT_YEAR)) {
    const year = normalizeRVYear(match[1]);
    if (year == null) continue;
    found.push({ index: match.index ?? 0, year });
  }

  return found.sort((a, b) => a.index - b.index);
}

export function detectYearContext(query: string): YearContext {
  const tokens = collectYearTokens(query);
  const years = [...new Set(tokens.map((t) => t.year))].sort((a, b) => a - b);
  const rvYear = tokens.length > 0 ? tokens[tokens.length - 1]!.year : null;

  return {
    hasYear: years.length > 0,
    rvYear,
    years,
  };
}
