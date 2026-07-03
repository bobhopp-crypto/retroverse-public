import "server-only";

/** Re-export publish policy — coaching never blocks; structure gates only. */
export {
  autoApproveStandardIfEligible,
  autoPublishStandard,
  assessStructuralPublishReadiness,
  formatFatalReason,
  PUBLISH_SCORE_AUTO_THRESHOLD,
  PUBLISH_SCORE_HIGH,
  PUBLISH_SCORE_REJECT_BELOW,
  PUBLISH_SCORE_REVIEW_MIN,
  scoreTierForQuality,
  scoreTierLabel,
  STANDARD_AUTO_APPROVE_MIN_SCORE,
} from "./publish-policy";
export type { AutoPublishResult, StructuralPublishAssessment } from "./publish-policy";
