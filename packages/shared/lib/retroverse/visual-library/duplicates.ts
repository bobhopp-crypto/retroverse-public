import type { DuplicatePairRecommendation, LibraryPerformanceFrame } from "./types";

const DUPLICATE_THRESHOLD = 85;

function hexToRgb(hex: string): [number, number, number] | null {
  const n = hex.replace("#", "");
  if (n.length !== 6) return null;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

function colorSimilarity(colorsA: string[], colorsB: string[]): number {
  const a = colorsA.map(hexToRgb).filter(Boolean) as [number, number, number][];
  const b = colorsB.map(hexToRgb).filter(Boolean) as [number, number, number][];
  if (a.length === 0 || b.length === 0) return 50;

  let best = 0;
  for (const ca of a.slice(0, 3)) {
    for (const cb of b.slice(0, 3)) {
      const dist = Math.sqrt(
        (ca[0]! - cb[0]!) ** 2 + (ca[1]! - cb[1]!) ** 2 + (ca[2]! - cb[2]!) ** 2,
      );
      const sim = Math.max(0, 100 - (dist / 441.67) * 100);
      if (sim > best) best = sim;
    }
  }
  return best;
}

function shotTypeSimilarity(a: LibraryPerformanceFrame, b: LibraryPerformanceFrame): number {
  if (a.shotType === b.shotType) return 95;
  const pair = new Set([a.shotType, b.shotType]);
  if (pair.has("hero") && pair.has("performance")) return 78;
  if (pair.has("hero") && pair.has("close_up")) return 72;
  if (pair.has("performance") && pair.has("close_up")) return 68;
  if (pair.has("alternate") && pair.has("wide")) return 75;
  return 40;
}

function timestampSimilarity(a: LibraryPerformanceFrame, b: LibraryPerformanceFrame): number {
  if (a.timestampSec == null || b.timestampSec == null) return 50;
  const delta = Math.abs(a.timestampSec - b.timestampSec);
  if (delta <= 2) return 95;
  if (delta <= 8) return 82;
  if (delta <= 20) return 65;
  return 35;
}

/** Score similarity between two performance frames (0–100). */
export function scoreFramePair(a: LibraryPerformanceFrame, b: LibraryPerformanceFrame): number {
  if (a.id === b.id) return 100;

  const shot = shotTypeSimilarity(a, b);
  const color = colorSimilarity(a.dominantColors, b.dominantColors);
  const time = timestampSimilarity(a, b);
  const categoryBoost = a.category && a.category === b.category ? 12 : 0;

  const raw = shot * 0.45 + color * 0.3 + time * 0.25 + categoryBoost;
  return Math.min(100, Math.round(raw));
}

function frameLabel(frame: LibraryPerformanceFrame): string {
  return frame.category ?? frame.shotType ?? frame.filename;
}

/** Find near-duplicate frame pairs and recommend which to keep. */
export function findDuplicateSuggestions(
  frames: LibraryPerformanceFrame[],
  threshold = DUPLICATE_THRESHOLD,
): DuplicatePairRecommendation[] {
  const suggestions: DuplicatePairRecommendation[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const a = frames[i]!;
      const b = frames[j]!;
      const similarity = scoreFramePair(a, b);
      if (similarity < threshold) continue;

      const pairKey = [a.id, b.id].sort().join(":");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const keep = a.qualityScore >= b.qualityScore ? a : b;
      const discard = keep.id === a.id ? b : a;

      suggestions.push({
        frameAId: a.id,
        frameBId: b.id,
        frameALabel: frameLabel(a),
        frameBLabel: frameLabel(b),
        similarityPercent: similarity,
        keepFrameId: keep.id,
        discardFrameId: discard.id,
        reason:
          similarity >= 95
            ? "Near-identical composition and palette — keep higher quality score only."
            : "High visual similarity — avoid generating multiple derived assets from both.",
      });
    }
  }

  return suggestions.sort((x, y) => y.similarityPercent - x.similarityPercent);
}

export function isNearDuplicatePair(
  a: LibraryPerformanceFrame,
  b: LibraryPerformanceFrame,
  threshold = DUPLICATE_THRESHOLD,
): boolean {
  return scoreFramePair(a, b) >= threshold;
}
