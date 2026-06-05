/** Review Universe — active years and video-universe mode. */
export const REVIEW_PILOT_ACTIVE_YEARS = [1967, 1978, 1992] as const;

export type ReviewPilotYear = (typeof REVIEW_PILOT_ACTIVE_YEARS)[number];

/** @deprecated Chart Top-N pilot slice — video universe mode uses all 130 files. */
export const REVIEW_PILOT_TOP_N = 10;

const PILOT_YEAR_SET = new Set<number>(REVIEW_PILOT_ACTIVE_YEARS);

export function isReviewPilotYear(year: number): year is ReviewPilotYear {
  return PILOT_YEAR_SET.has(year);
}

export function isReviewUniverseActive(): boolean {
  return process.env.RETROVERSE_REVIEW_PILOT !== "0";
}

/** Video-universe review UI for 1967 / 1978 / 1992. */
export function reviewUniverseEnabledForYear(year: number): boolean {
  return isReviewUniverseActive() && isReviewPilotYear(year);
}

/** @deprecated Use reviewUniverseEnabledForYear */
export function isReviewPilotActive(): boolean {
  return isReviewUniverseActive();
}

/** @deprecated Use reviewUniverseEnabledForYear */
export function reviewPilotEnabledForYear(year: number): boolean {
  return reviewUniverseEnabledForYear(year);
}

/** @deprecated Chart-first pilot filter */
export function filterReviewPilotRows<T extends { peak: number | null }>(
  rows: T[],
  topN: number = REVIEW_PILOT_TOP_N,
): T[] {
  return rows.filter((r) => (r.peak ?? 999) <= topN);
}

export function reviewActiveYears(primaryYear: number): number[] {
  return [...REVIEW_PILOT_ACTIVE_YEARS];
}
