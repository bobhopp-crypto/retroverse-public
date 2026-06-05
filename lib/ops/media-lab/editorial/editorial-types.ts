/** Client-safe editorial review types (no Node / fs imports). */

import type { ChapterReviewFlags } from "./review-metrics";
import type { ClipReviewStatus } from "./review-status";
import type { ClipTagSuggestion } from "./transcript-suggestions";

export type EditorialChapterRow = {
  id: string;
  startSec: number;
  endSec: number;
  title: string;
  start: string;
  end: string;
  durationSec: number;
  clock: string;
  reviewFlags?: ChapterReviewFlags;
  tagSuggestion?: ClipTagSuggestion;
  reviewStatus?: ClipReviewStatus;
  favorite?: boolean;
  category?: string;
  /** Curator IN/OUT bumper selection (whole seconds). */
  inSeconds?: number;
  outSeconds?: number;
  lengthSeconds?: number;
};
