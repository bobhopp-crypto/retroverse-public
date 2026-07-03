/** Billboard Hot 100 milestone bands — hard thresholds, no interpolation. */
export type ChartHeatBand = "numberOne" | "top10" | "top20" | "top40" | "hot100";

export const CHART_MILESTONE_COLORS: Record<Exclude<ChartHeatBand, "numberOne">, string> = {
  top10: "#e85d04",
  top20: "#f77f00",
  top40: "#f1c40f",
  hot100: "#27ae60",
};

export const CHART_NUMBER_ONE_COLOR = "#ff2222";

export function chartHeatBand(rank: number, maxRank = 100): ChartHeatBand {
  if (rank === 1) return "numberOne";
  const position = maxRank === 100 ? rank : Math.max(1, Math.round((rank / maxRank) * 100));
  if (position <= 10) return "top10";
  if (position <= 20) return "top20";
  if (position <= 40) return "top40";
  return "hot100";
}

export function chartHeatColor(rank: number, maxRank = 100): string {
  const band = chartHeatBand(rank, maxRank);
  if (band === "numberOne") return CHART_NUMBER_ONE_COLOR;
  return CHART_MILESTONE_COLORS[band];
}

/** Bar width: #1 = longest, lower ranks shrink toward the floor. */
export function chartBarWidthPct(rank: number, maxRank = 100): number {
  const p = Math.max(1, Math.min(maxRank, rank));
  const min = 12;
  const max = 100;
  if (maxRank === 100) {
    return Math.round(min + ((101 - p) / 100) * (max - min));
  }
  return Math.round(min + ((maxRank + 1 - p) / maxRank) * (max - min));
}
