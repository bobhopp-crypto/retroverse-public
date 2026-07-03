/** Compilation / soundtrack heuristics — visibility only, never blocks approval. */

export type CompilationRiskLevel = "none" | "low" | "high";

export type CompilationRisk = {
  level: CompilationRiskLevel;
  signals: string[];
  label: string;
};

const COMPILATION_PATTERNS: { pattern: RegExp; signal: string }[] = [
  { pattern: /\bgreatest\s+hits\b/i, signal: "greatest_hits" },
  { pattern: /\bbest\s+of\b/i, signal: "best_of" },
  { pattern: /\bcollection\b/i, signal: "collection" },
  { pattern: /\banthology\b/i, signal: "anthology" },
  { pattern: /\bultimate\b/i, signal: "ultimate_collection" },
  { pattern: /\bessential\b/i, signal: "essential_collection" },
  { pattern: /\bplatinum\b/i, signal: "platinum_collection" },
  { pattern: /\bsoundtrack\b/i, signal: "soundtrack" },
  { pattern: /\bmotion\s+picture\b/i, signal: "motion_picture" },
  { pattern: /\boriginal\s+cast\b/i, signal: "original_cast" },
  { pattern: /\bvarious\s+artists\b/i, signal: "various_artists" },
  { pattern: /\bva\b/i, signal: "va_abbrev" },
  { pattern: /^the\s+.*\s+story\b/i, signal: "story_compilation" },
];

const VA_ARTIST_PATTERNS = [
  /^various$/i,
  /^various\s+artists$/i,
  /^va$/i,
  /^soundtrack$/i,
  /^original\s+soundtrack$/i,
];

export function assessCompilationRisk(
  albumTitle: string,
  albumArtistName: string,
): CompilationRisk {
  const signals: string[] = [];
  const haystack = `${albumTitle} ${albumArtistName}`.trim();

  for (const { pattern, signal } of COMPILATION_PATTERNS) {
    if (pattern.test(haystack)) signals.push(signal);
  }

  const artist = albumArtistName.trim().toLowerCase();
  if (VA_ARTIST_PATTERNS.some((p) => p.test(artist))) {
    signals.push("various_artist_album_artist");
  }

  const unique = [...new Set(signals)];
  if (unique.length === 0) {
    return { level: "none", signals: [], label: "studio-era album" };
  }
  if (unique.some((s) => s === "soundtrack" || s === "various_artists" || s === "various_artist_album_artist")) {
    return {
      level: "high",
      signals: unique,
      label: "compilation / soundtrack risk",
    };
  }
  return {
    level: "low",
    signals: unique,
    label: "probable compilation",
  };
}
