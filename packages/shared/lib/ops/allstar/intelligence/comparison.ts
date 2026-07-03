import type { CadacoComparison, DiscRates, PlayerCareerStats, RateComparison } from "./types";
import { careerRates, discRatesFromProbabilities } from "./types";
import type { WedgeProbabilities } from "../types";

const METRICS: Array<{ key: RateComparison["key"]; label: string; discKey: keyof DiscRates }> = [
  { key: "hr", label: "Home Run", discKey: "hr" },
  { key: "bb", label: "Walk", discKey: "bb" },
  { key: "k", label: "Strikeout", discKey: "k" },
  { key: "double", label: "Double", discKey: "double" },
  { key: "triple", label: "Triple", discKey: "triple" },
];

export function buildCadacoComparison(
  probabilities: WedgeProbabilities,
  career: PlayerCareerStats,
): CadacoComparison {
  const disc = discRatesFromProbabilities(probabilities);
  const actual = careerRates(career);

  const rates: RateComparison[] = METRICS.map(({ key, label, discKey }) => {
    const discPct = disc[discKey];
    const actualPct = actual[discKey];
    return {
      key,
      label,
      discPct,
      actualPct,
      delta: discPct - actualPct,
    };
  });

  const meanAbsDelta =
    rates.reduce((sum, rate) => sum + Math.abs(rate.delta), 0) / Math.max(rates.length, 1);

  const accuracyScore = Math.round(Math.max(0, Math.min(100, 100 - meanAbsDelta * 400)));
  const accuracyLabel =
    accuracyScore >= 85 ? "Excellent match" : accuracyScore >= 70 ? "Strong match" : accuracyScore >= 55 ? "Fair match" : "Loose match";

  const hrDelta = rates.find((r) => r.key === "hr")?.delta ?? 0;
  const summary =
    Math.abs(hrDelta) < 0.01
      ? "Cadaco's disc profile tracks this player's real career rates closely."
      : hrDelta > 0
        ? "Cadaco gave this player more home run weight than their MLB career rate."
        : "Cadaco modeled this player as less of a home run threat than real life.";

  return { rates, accuracyScore, accuracyLabel, summary };
}

export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length < 2 || ys.length < 2 || xs.length !== ys.length) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

export function surpriseScore(comparison: CadacoComparison): number {
  return comparison.rates.reduce((sum, rate) => sum + Math.abs(rate.delta), 0);
}
