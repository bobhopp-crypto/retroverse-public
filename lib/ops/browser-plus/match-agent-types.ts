import type { BrowserPlusQueueCandidate } from "@/lib/ops/browser-plus/match-queue-types";

/** Match Agent Phase 2 bucket (post-classification). */
export type MatchAgentBucket = "auto-matched" | "needs-review" | "no-candidate";

export type MatchAgentResultRow = {
  rowId: string;
  filePath: string;
  artist: string;
  title: string;
  bucket: MatchAgentBucket;
  matchTier: string | null;
  combinedScore: number;
  artistScore: number;
  titleScore: number;
  rvtr: string | null;
  matchedTitle: string | null;
  matchedArtist: string | null;
  assigned: boolean;
  assignError: string | null;
  assignLabel: string | null;
};

export type MatchAgentReport = {
  runAt: string;
  dryRun: boolean;
  databasePath: string;
  backupPath: string | null;
  totals: {
    unmatched: number;
    autoMatched: number;
    needsReview: number;
    noCandidate: number;
    assigned: number;
    assignFailed: number;
    assignSkipped: number;
  };
  autoMatched: MatchAgentResultRow[];
  needsReview: MatchAgentResultRow[];
  noCandidate: MatchAgentResultRow[];
};

export const AGENT_AUTO_MIN_SCORE = 95;

/** High-confidence: tier A (exact artist + normalized title) or combined score ≥ 95. */
export function isAgentAutoMatch(
  top: BrowserPlusQueueCandidate | null,
  matchTier: string | null,
): boolean {
  if (!top) return false;
  if (matchTier === "A") return true;
  return (top.matchScore ?? 0) >= AGENT_AUTO_MIN_SCORE;
}

export function classifyAgentBucket(
  top: BrowserPlusQueueCandidate | null,
  matchTier: string | null,
): MatchAgentBucket {
  if (!top) return "no-candidate";
  if (isAgentAutoMatch(top, matchTier)) return "auto-matched";
  return "needs-review";
}
