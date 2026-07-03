import type { BrowserPlusMatchRow } from "@/lib/ops/browser-plus/types";

/** Queue confidence band for unmatched VIDEO matching. */
export type BrowserPlusMatchBand = "auto" | "review" | "search";

export type BrowserPlusQueueCandidate = BrowserPlusMatchRow & {
  artistScore: number;
  titleScore: number;
};

export type BrowserPlusQueueItem = {
  rowId: string;
  filePath: string;
  artist: string;
  title: string;
  band: BrowserPlusMatchBand;
  combinedScore: number;
  top: BrowserPlusQueueCandidate | null;
  alternatives: BrowserPlusQueueCandidate[];
  /** loadMatchCandidates tier for top match (A = exact normalized). */
  matchTier: string | null;
};

export type BrowserPlusMatchBatchResult = {
  items: BrowserPlusQueueItem[];
  scored: number;
  total: number;
};

export type BrowserPlusAssignBatchResult = {
  ok: number;
  skipped: number;
  failed: Array<{ filePath: string; message: string }>;
  backupPath: string | null;
};

export const AUTO_MATCH_MIN_COMBINED = 92;
export const AUTO_MATCH_MIN_ARTIST = 80;
export const AUTO_MATCH_MIN_TITLE = 88;
export const REVIEW_MIN_COMBINED = 68;
