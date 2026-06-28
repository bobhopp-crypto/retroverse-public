/**
 * Sprint 3.34 — Rank discoveries by editorial interest.
 */

import type { DirectorInterestingDiscovery } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function rankDiscoveries(
  discoveries: DirectorInterestingDiscovery[],
): DirectorInterestingDiscovery[] {
  const ranked = discoveries.map((d) => {
    const c = d.confidence;
    const scores = {
      audienceInterest: clamp(
        c * 0.85 + (d.category === "unexpected_chart_success" ? 12 : 0) + (d.category === "rare_recording_story" ? 10 : 0),
      ),
      historicalSignificance: clamp(
        c * 0.75 + (d.factIds.length > 1 ? 10 : 0) + (/chart|album|gold/i.test(d.title) ? 8 : 0),
      ),
      emotionalImpact: clamp(
        c * 0.7 + (/bathroom|pitch|live|performance/i.test(d.title) ? 18 : 0),
      ),
      visualPotential: clamp(c * 0.6 + (d.mediaIds.length > 0 ? 28 : 12)),
      researchConfidence: clamp(c),
      uniqueness: clamp(
        c * 0.8 + (d.category === "rare_recording_story" || d.category === "historical_coincidence" ? 12 : 0),
      ),
      composite: 0,
    };

    scores.composite = clamp(
      scores.audienceInterest * 0.22 +
        scores.historicalSignificance * 0.18 +
        scores.emotionalImpact * 0.18 +
        scores.visualPotential * 0.15 +
        scores.researchConfidence * 0.12 +
        scores.uniqueness * 0.15,
    );

    return { ...d, scores };
  });

  ranked.sort((a, b) => b.scores.composite - a.scores.composite);
  return ranked.map((d, i) => ({ ...d, rank: i + 1 }));
}
