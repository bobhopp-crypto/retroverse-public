import type { AlbumChartFeatureRow, AlbumChartFeatures } from "./album-chart-features";

export type SimilarAlbumMatch = {
  rval: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string | null;
  href: string;
  reason: string;
  distance: number;
};

const FEATURE_WEIGHTS: Record<keyof AlbumChartFeatures, number> = {
  debutRank: 0.9,
  peakRank: 1.4,
  weeksToPeak: 1.1,
  totalChartWeeks: 1.2,
  weeksAtNumberOne: 1.3,
  weeksAtPeak: 0.8,
  reEntryCount: 1.0,
  longestGapOffChart: 1.0,
  reboundCount: 0.7,
  declineRate: 0.6,
  longevityAfterPeak: 1.1,
};

const NORMALIZERS: Record<keyof AlbumChartFeatures, number> = {
  debutRank: 200,
  peakRank: 200,
  weeksToPeak: 40,
  totalChartWeeks: 80,
  weeksAtNumberOne: 20,
  weeksAtPeak: 20,
  reEntryCount: 5,
  longestGapOffChart: 200,
  reboundCount: 3,
  declineRate: 15,
  longevityAfterPeak: 60,
};

function normalizedDistance(a: number, b: number, scale: number): number {
  if (scale <= 0) return 0;
  return Math.abs(a - b) / scale;
}

export function albumChartDistance(
  current: AlbumChartFeatures,
  candidate: AlbumChartFeatures,
): number {
  let total = 0;
  let weightSum = 0;

  for (const key of Object.keys(FEATURE_WEIGHTS) as Array<keyof AlbumChartFeatures>) {
    const weight = FEATURE_WEIGHTS[key];
    const scale = NORMALIZERS[key];
    const delta = normalizedDistance(current[key], candidate[key], scale);
    total += delta * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? total / weightSum : 0;
}

function describeDifference(
  current: AlbumChartFeatures,
  candidate: AlbumChartFeatures,
): string {
  const parts: string[] = [];

  const debutDelta = Math.abs(current.debutRank - candidate.debutRank);
  const peakDelta = Math.abs(current.peakRank - candidate.peakRank);
  const weeksDelta = Math.abs(current.totalChartWeeks - candidate.totalChartWeeks);
  const climbDelta = Math.abs(current.weeksToPeak - candidate.weeksToPeak);
  const longevityDelta = Math.abs(current.longevityAfterPeak - candidate.longevityAfterPeak);

  if (climbDelta <= 3 && current.weeksToPeak >= 6 && candidate.weeksToPeak >= 6) {
    parts.push("similar slow climb");
  } else if (climbDelta <= 2 && current.weeksToPeak <= 3) {
    parts.push("similar fast rise");
  }

  if (weeksDelta <= 8 && current.totalChartWeeks >= 20) {
    parts.push("long chart run");
  }

  if (
    current.reEntryCount > 0 &&
    candidate.reEntryCount > 0 &&
    Math.abs(current.reEntryCount - candidate.reEntryCount) <= 1
  ) {
    parts.push("multiple returns to the chart");
  }

  if (
    current.longevityAfterPeak >= 10 &&
    longevityDelta <= 8 &&
    candidate.longevityAfterPeak >= 10
  ) {
    parts.push("long post-peak run");
  }

  if (current.weeksAtNumberOne >= 4 && candidate.weeksAtNumberOne >= 4) {
    parts.push("extended weeks at #1");
  }

  if (debutDelta <= 15 && peakDelta <= 5 && current.peakRank <= 10) {
    parts.push("near-top debut and peak");
  }

  if (parts.length === 0) {
    if (peakDelta <= 10 && weeksDelta <= 15) return "Similar peak strength and chart endurance.";
    if (climbDelta <= 4) return "Similar climb timing on the Billboard 200.";
    return "Comparable chart arc on the Billboard 200.";
  }

  const lead = parts.slice(0, 2).join(" and ");
  return `Similar ${lead}.`;
}

export function rankSimilarAlbumChartJourneys(input: {
  currentRval: string;
  currentTitleKey: string;
  current: AlbumChartFeatures;
  candidates: AlbumChartFeatureRow[];
  coverByRval: Map<string, string | null>;
  hrefByRval: Map<string, string>;
  limit?: number;
}): SimilarAlbumMatch[] {
  const {
    currentRval,
    currentTitleKey,
    current,
    candidates,
    coverByRval,
    hrefByRval,
    limit = 4,
  } = input;

  const scored = candidates
    .filter((row) => row.rval !== currentRval)
    .filter((row) => row.titleKey !== currentTitleKey)
    .map((row) => ({
      row,
      distance: albumChartDistance(current, row),
      reason: describeDifference(current, row),
    }))
    .sort((a, b) => a.distance - b.distance || a.row.title.localeCompare(b.row.title));

  const picks: SimilarAlbumMatch[] = [];
  for (const entry of scored) {
    const href = hrefByRval.get(entry.row.rval);
    if (!href) continue;
    picks.push({
      rval: entry.row.rval,
      title: entry.row.title,
      artistName: entry.row.artistName,
      releaseYear: entry.row.releaseYear,
      coverUrl: coverByRval.get(entry.row.rval) ?? null,
      href,
      reason: entry.reason,
      distance: entry.distance,
    });
    if (picks.length >= limit) break;
  }

  return picks;
}
