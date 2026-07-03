import type { MatchStatus } from "@/lib/ops/reconciliation-model";

/** Match confidence uses media links only — never VDJ vs chart year equality. */

export function importanceScoreFromPeak(
  peak: number | null,
  weeks = 0,
): number {
  let peakScore = 0;
  if (peak != null) {
    if (peak <= 10) peakScore = Math.max(1, 100 - peak * 3);
    else if (peak <= 40) peakScore = Math.max(1, 60 - peak);
    else peakScore = Math.max(1, 30 - Math.floor(peak / 10));
  }
  const weekBonus = Math.min(Math.max(weeks, 0), 52);
  return peakScore + Math.floor(weekBonus / 2);
}

export function acquisitionPriority(
  peak: number | null,
): "high" | "medium" | "low" {
  if (peak != null && peak <= 10) return "high";
  if (peak != null && peak <= 40) return "medium";
  return "low";
}

export function deriveMatchStatus(input: {
  hasVdjMedia: boolean;
  hasVideo: boolean;
  bestMatch: string | null;
  linkConfidence: number | null;
}): { status: MatchStatus; confidence: "high" | "medium" | "low" | "none" } {
  if (input.hasVdjMedia || input.hasVideo) {
    return { status: "matched", confidence: "high" };
  }

  if (input.bestMatch) {
    const score = input.linkConfidence ?? 0;
    if (score >= 80) {
      return { status: "possible_match", confidence: "medium" };
    }
    if (score >= 50) {
      return { status: "needs_review", confidence: "medium" };
    }
    return { status: "needs_review", confidence: "low" };
  }

  return { status: "missing", confidence: "none" };
}

export function youtubeSearchUrl(artist: string, title: string, year: number): string {
  const q = encodeURIComponent(`${artist} ${title} ${year}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}
