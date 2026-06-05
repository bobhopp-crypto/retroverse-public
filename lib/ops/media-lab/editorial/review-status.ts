/** Clip-level acquisition review (per chapter). */
export const CLIP_REVIEW_STATUSES = ["Keep", "Reject"] as const;
export type ClipReviewStatus = (typeof CLIP_REVIEW_STATUSES)[number];

/** Source-level acquisition review (whole job / source file). */
export const SOURCE_REVIEW_STATUSES = ["Keep Source", "Delete Source"] as const;
export type SourceReviewStatus = (typeof SOURCE_REVIEW_STATUSES)[number];

const LEGACY_KEEP = new Set(["Keep", "Must Use"]);
const LEGACY_REJECT = new Set(["Reject", "Delete", "Maybe"]);

export function normalizeClipReviewStatus(value: unknown): ClipReviewStatus | undefined {
  if (typeof value !== "string") return undefined;
  if (CLIP_REVIEW_STATUSES.includes(value as ClipReviewStatus)) {
    return value as ClipReviewStatus;
  }
  if (LEGACY_KEEP.has(value)) return "Keep";
  if (LEGACY_REJECT.has(value)) return "Reject";
  return undefined;
}

export function parseClipReviewStatus(value: unknown): ClipReviewStatus | undefined {
  return normalizeClipReviewStatus(value);
}

export function parseSourceReviewStatus(value: unknown): SourceReviewStatus | undefined {
  if (typeof value !== "string") return undefined;
  return SOURCE_REVIEW_STATUSES.includes(value as SourceReviewStatus)
    ? (value as SourceReviewStatus)
    : undefined;
}

export function isExportableClipStatus(status?: ClipReviewStatus): boolean {
  return status === "Keep";
}

export function shouldArchiveSource(status?: SourceReviewStatus): boolean {
  return status === "Keep Source";
}

export type ClipReviewCounts = {
  Keep: number;
  Reject: number;
  unreviewed: number;
  exportable: number;
};

export function summarizeClipReviewCounts(
  chapters: { id: string; reviewStatus?: ClipReviewStatus }[],
): ClipReviewCounts {
  const counts: ClipReviewCounts = {
    Keep: 0,
    Reject: 0,
    unreviewed: 0,
    exportable: 0,
  };
  for (const ch of chapters) {
    if (!ch.reviewStatus) {
      counts.unreviewed++;
      continue;
    }
    if (ch.reviewStatus === "Keep") {
      counts.Keep++;
      counts.exportable++;
    } else {
      counts.Reject++;
    }
  }
  return counts;
}
