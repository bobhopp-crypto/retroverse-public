import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

export type CoverageSummaryMetrics = {
  owned: number;
  youtube: number;
  missing: number;
  total: number;
  /** Owned VIDEO / total chart targets (0–100). */
  coveragePct: number;
};

export type YearCoverageRow = CoverageSummaryMetrics & { year: number };

export type ArtistCoverageRow = CoverageSummaryMetrics & {
  artistName: string;
  slug: string;
};

export function coveragePct(owned: number, total: number): number {
  return total > 0 ? Math.round((owned / total) * 100) : 0;
}

export function emptyCoverageSummary(): CoverageSummaryMetrics {
  return { owned: 0, youtube: 0, missing: 0, total: 0, coveragePct: 0 };
}

/** Aggregate owned / youtube / missing counts from per-RVTR statuses. */
export function aggregateCoverageSummary(
  statuses: Iterable<TrackCoverageStatus>,
): CoverageSummaryMetrics {
  let owned = 0;
  let youtube = 0;
  let missing = 0;
  for (const status of statuses) {
    if (status === "owned") owned += 1;
    else if (status === "youtube") youtube += 1;
    else missing += 1;
  }
  const total = owned + youtube + missing;
  return { owned, youtube, missing, total, coveragePct: coveragePct(owned, total) };
}
