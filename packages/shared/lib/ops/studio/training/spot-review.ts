export type SpotReviewCandidate = {
  rvtr: string;
  confidence: number;
  risk: number;
};

function hashPick<T>(items: T[], seed: number): T | null {
  if (items.length === 0) return null;
  const index = Math.abs(seed) % items.length;
  return items[index] ?? null;
}

/** Pick 3 representative songs: highest risk, lowest confidence, random remainder. */
export function pickSpotReviewRvtrs(
  candidates: SpotReviewCandidate[],
  pickCount = 3,
): string[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= pickCount) {
    return candidates.map((c) => c.rvtr);
  }

  const picked = new Set<string>();
  const byRisk = [...candidates].sort((a, b) => b.risk - a.risk);
  const byConfidence = [...candidates].sort((a, b) => a.confidence - b.confidence);

  picked.add(byRisk[0]!.rvtr);

  const lowConf = byConfidence.find((c) => !picked.has(c.rvtr));
  if (lowConf) picked.add(lowConf.rvtr);

  const remainder = candidates.filter((c) => !picked.has(c.rvtr));
  const random = hashPick(remainder, Date.now() + candidates.length);
  if (random) picked.add(random.rvtr);

  while (picked.size < pickCount && remainder.length > 0) {
    const next = remainder.find((c) => !picked.has(c.rvtr));
    if (!next) break;
    picked.add(next.rvtr);
  }

  return [...picked].slice(0, pickCount);
}

export function averageConfidence(candidates: SpotReviewCandidate[]): number {
  if (candidates.length === 0) return 0;
  return Math.round(
    candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length,
  );
}

export function averageRisk(candidates: SpotReviewCandidate[]): number {
  if (candidates.length === 0) return 0;
  return Math.round(candidates.reduce((sum, c) => sum + c.risk, 0) / candidates.length);
}
