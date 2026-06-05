import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import { normalizeRvTags } from "@/lib/ops/rvtags-review/vocabulary";
import { VDJ_ROTATION_COCKTAIL_THRESHOLD } from "./vdj-rotation-signal";

export const REVIEW_CLASSIFICATIONS = [
  "Fill",
  "Cocktail",
  "Dance",
  "Slow",
] as const;

export type ReviewClassification = (typeof REVIEW_CLASSIFICATIONS)[number];

const CLASSIFICATION_SET = new Set<string>(REVIEW_CLASSIFICATIONS);

export function isReviewClassification(value: string): value is ReviewClassification {
  return CLASSIFICATION_SET.has(value);
}

/**
 * Persisted review fields per workspace row (year-scoped ops state).
 *
 * Performance Class may sync to VirtualDJ later; it is not the same as Retroverse Tags.
 * Retroverse Tags belong on RVTR (`ops/retroverse-tags-by-rvtr.json`).
 * `historicalTags` here is legacy/transitional only — do not add new writes.
 */
export type YearReviewRecord = {
  classification?: ReviewClassification;
  /** When true, rotation-based Class suggestion is suppressed after manual override. */
  classificationLocked?: boolean;
  /** @deprecated Legacy RVTR tags mirrored on workspace key — migrate to RVTR store. */
  historicalTags?: RvTagId[];
  updatedAt?: string;
};

export function normalizeHistoricalTags(values: unknown): RvTagId[] {
  if (!Array.isArray(values)) return [];
  const strings = values.filter((v): v is string => typeof v === "string");
  return normalizeRvTags(strings);
}

export function normalizeReviewRecord(raw: unknown): YearReviewRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const out: YearReviewRecord = {};

  if (typeof obj.classification === "string" && isReviewClassification(obj.classification)) {
    out.classification = obj.classification;
  }
  if (obj.classificationLocked === true) {
    out.classificationLocked = true;
  }

  const tags = normalizeHistoricalTags(obj.historicalTags);
  if (tags.length > 0) {
    out.historicalTags = tags;
  }

  if (typeof obj.updatedAt === "string" && obj.updatedAt.trim()) {
    out.updatedAt = obj.updatedAt.trim();
  }

  if (
    out.classification == null &&
    !out.classificationLocked &&
    (out.historicalTags?.length ?? 0) === 0
  ) {
    return null;
  }

  return out;
}

/** Effective Class; may apply rotation-suggested Cocktail when nothing is persisted yet. */
export function effectiveClassification(
  record: YearReviewRecord | undefined,
  playCount: number | null,
): ReviewClassification {
  if (record?.classification) return record.classification;
  if (
    !record?.classificationLocked &&
    playCount != null &&
    playCount >= VDJ_ROTATION_COCKTAIL_THRESHOLD
  ) {
    return "Cocktail";
  }
  return "Fill";
}

/** Fill with low/unknown rotation signal — still needs manual Class review. */
export function needsReview(
  record: YearReviewRecord | undefined,
  playCount: number | null,
): boolean {
  return (
    effectiveClassification(record, playCount) === "Fill" &&
    (playCount == null || playCount < VDJ_ROTATION_COCKTAIL_THRESHOLD)
  );
}

export function migrateReviews(
  raw: Record<string, unknown> | undefined,
): Record<string, YearReviewRecord> {
  const reviews: Record<string, YearReviewRecord> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    const record = normalizeReviewRecord(value);
    if (record) reviews[key] = record;
  }
  return reviews;
}
