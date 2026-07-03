import type { HealingDegradationFlag } from "@/lib/healing/degradation";

export type HealingRowPriorityInput = {
  chartWeeks: number;
  topConfidence: number | null;
  degradationFlags: HealingDegradationFlag[];
  duplicateCluster: { duplicateConfidence: number } | null;
};

/** Higher = review first (emotional + confidence impact). */
export function healingImpactScore(input: HealingRowPriorityInput): number {
  let score = input.chartWeeks;

  if (input.degradationFlags.includes("cover_critical")) {
    score += 80 + input.chartWeeks * 0.5;
  } else if (input.degradationFlags.includes("missing_cover")) {
    score += 35;
  }

  if (input.degradationFlags.includes("missing_album_links")) {
    score += 25;
  }

  if (input.duplicateCluster) {
    score += 20 + input.duplicateCluster.duplicateConfidence * 40;
  }

  if (input.topConfidence != null && input.topConfidence >= 0.45) {
    score += 15 + input.topConfidence * 30;
  } else if (input.topConfidence != null) {
    score += input.topConfidence * 10;
  }

  if (input.degradationFlags.includes("orphan_vdj")) {
    score += 12;
  }

  return Math.round(score * 10) / 10;
}

export function compareHealingRows(
  a: HealingRowPriorityInput & { impactScore: number },
  b: HealingRowPriorityInput & { impactScore: number },
): number {
  return (
    b.impactScore - a.impactScore ||
    b.chartWeeks - a.chartWeeks ||
    (b.topConfidence ?? 0) - (a.topConfidence ?? 0)
  );
}
