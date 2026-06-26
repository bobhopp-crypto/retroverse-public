/**
 * Browser+ 2 — thin adapter over Studio Kernel status/readiness helpers.
 * Preserves BP2 import paths and types; logic lives in `lib/studio/status.ts`.
 */

export type { StudioStage as Bp2StudioStage, StudioStoryStatus as Bp2StudioStoryStatus } from "@/lib/studio/types";

export type { StudioNeedFlags, StudioConfidenceLabel } from "@/lib/studio/types";

export {
  deriveStudioStage,
  studioStageLabel,
  studioConfidenceLabel,
  storyStatusFromEditorial,
  isStudioRenderReady,
  deriveStudioNeedFlags,
  buildStudioMissingItems,
  defaultStudioNeedFlags,
  defaultStudioMissingItems,
  normalizeJobStatus,
} from "@/lib/studio/status";
