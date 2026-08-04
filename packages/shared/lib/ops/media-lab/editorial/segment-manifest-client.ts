export const PRIMARY_SEGMENT_CLASSES = ["performance", "documentary_scene", "unknown"] as const;
export const DOCUMENTARY_SCENE_CLASSES = ["interview", "announcement", "crowd", "backstage", "traffic", "weather", "production", "campsite", "sanitation", "vendor", "transportation", "transition", "aftermath", "other"] as const;
export const PERFORMANCE_CLASSES = ["full_performance", "partial_performance", "rehearsal", "soundcheck", "performance_montage", "unknown_performance"] as const;
export const REVIEW_STATUSES = ["draft", "review", "approved", "rejected"] as const;
export const EXPORT_STATUSES = ["not_queued", "queued", "exporting", "exported", "failed"] as const;
export type PrimarySegmentClass = (typeof PRIMARY_SEGMENT_CLASSES)[number];
export type EditorialSegment = {
  id: string; sourceFilename: string; sourceFingerprint: string; startSeconds: number; endSeconds: number; startTimecode: string; endTimecode: string; durationSeconds: number; primaryClass: PrimarySegmentClass; secondaryClass?: string; title: string; artistPeople?: string; song?: string; festivalDay?: string; approximateFestivalTime?: string; description?: string; notes?: string; reviewStatus: (typeof REVIEW_STATUSES)[number]; exportStatus: (typeof EXPORT_STATUSES)[number]; includeForExport?: boolean; outputFilepath?: string; exportMethod?: "stream_copy" | "transcode"; exportedAt?: string; ffprobeValidation?: { valid: boolean; durationSeconds?: number; hasVideo: boolean; hasAudio: boolean; container?: string; reason?: string }; failureReason?: string; retryCount?: number; createdAt: string; modifiedAt: string;
};
export function validateSegmentBounds(segment: Pick<EditorialSegment, "startSeconds" | "endSeconds">, sourceDurationSeconds: number): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(segment.startSeconds)) errors.push("startSeconds must be finite");
  if (!Number.isFinite(segment.endSeconds)) errors.push("endSeconds must be finite");
  if (!Number.isFinite(sourceDurationSeconds) || sourceDurationSeconds <= 0) errors.push("source duration must be finite and positive");
  if (Number.isFinite(segment.startSeconds) && segment.startSeconds < 0) errors.push("startSeconds must be >= 0");
  if (Number.isFinite(segment.endSeconds) && segment.endSeconds <= segment.startSeconds) errors.push("endSeconds must be greater than startSeconds");
  if (Number.isFinite(segment.endSeconds) && Number.isFinite(sourceDurationSeconds) && segment.endSeconds > sourceDurationSeconds + 0.05) errors.push("endSeconds exceeds source duration");
  return errors;
}
