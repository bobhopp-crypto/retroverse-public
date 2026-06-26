import "server-only";

import { canBuildCards } from "@/lib/ops/intelligence/card-assemble";
import { countApprovedFacts, promoteVerifiedFacts } from "@/lib/ops/intelligence/promote-verified-facts";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { auditVideoIdentification } from "@/lib/ops/intelligence/video-identification";
import { loadVideoUniverse } from "@/lib/ops/intelligence/video-universe";

export type ReviewNoCardsReason =
  | "ready_for_card_assembly"
  | "insufficient_approved_facts"
  | "insufficient_approved_stories"
  | "stories_exist_low_rank_score"
  | "story_references_bad_fact"
  | "no_candidate_stories"
  | "no_candidate_facts"
  | "process_log_error"
  | "unknown";

export type ReviewNoCardsRow = {
  rvtr: string;
  artist: string;
  title: string;
  playCount: number;
  reason: ReviewNoCardsReason;
  approvedFacts: number;
  approvedStories: number;
  candidateFacts: number;
  candidateStories: number;
  researchSources: number;
  lastLogLine: string | null;
  canBuildCardsReason: string | null;
};

export type PackageCompletionAudit = {
  scannedAt: string;
  ownedCohort: number;
  withPackageFile: number;
  reviewNoCards: number;
  reasonCounts: Array<{ reason: ReviewNoCardsReason; label: string; count: number; pct: number }>;
  draftNoCards: number;
  alreadyIntelligence: number;
  readyForCardAssembly: number;
  full1184Path: {
    cardsReady: number;
    published: number;
    reviewWithCards: number;
    reviewNoCardsReady: number;
    reviewNoCardsFixable: number;
    draftNoCards: number;
    projectedIntelligenceAfterCardAssembly: number;
  };
  effortEstimate: {
    tier1_card_assembly_only: { count: number; effort: string };
    tier2_auto_approve_stories: { count: number; effort: string };
    tier3_fact_promotion_or_reextract: { count: number; effort: string };
    tier4_draft_reprocess: { count: number; effort: string };
    tier5_empty_or_broken: { count: number; effort: string };
  };
  rows: ReviewNoCardsRow[];
};

const REASON_LABELS: Record<ReviewNoCardsReason, string> = {
  ready_for_card_assembly: "Ready — card assembly only (canBuildCards passes)",
  insufficient_approved_facts: "Insufficient approved facts (< 3)",
  insufficient_approved_stories: "Insufficient approved stories (< 1)",
  stories_exist_low_rank_score: "Stories exist but none auto-approved (rankScore < 0.5)",
  story_references_bad_fact: "Approved story references missing/rejected fact",
  no_candidate_stories: "No candidate stories proposed",
  no_candidate_facts: "No candidate facts extracted",
  process_log_error: "Process log contains ERROR",
  unknown: "Unknown / mixed",
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function classifyReviewNoCards(pkg: Awaited<ReturnType<typeof loadSongPackage>>): {
  reason: ReviewNoCardsReason;
  canBuildCardsReason: string | null;
} {
  if (!pkg) return { reason: "unknown", canBuildCardsReason: null };

  const facts = promoteVerifiedFacts(pkg.candidateFacts);
  const approvedFacts = countApprovedFacts(facts);
  const approvedStories = pkg.candidateStories.filter((s) => s.reviewStatus === "approved").length;
  const check = canBuildCards(pkg.candidateStories, facts);

  if (pkg.processLog.some((line) => line.includes("ERROR:"))) {
    return { reason: "process_log_error", canBuildCardsReason: check.reason ?? null };
  }
  if (check.ok) {
    return { reason: "ready_for_card_assembly", canBuildCardsReason: null };
  }
  if (pkg.candidateFacts.length === 0) {
    return { reason: "no_candidate_facts", canBuildCardsReason: check.reason ?? null };
  }
  if (pkg.candidateStories.length === 0) {
    return { reason: "no_candidate_stories", canBuildCardsReason: check.reason ?? null };
  }
  if (approvedFacts < 3) {
    return { reason: "insufficient_approved_facts", canBuildCardsReason: check.reason ?? null };
  }
  if (approvedStories < 1) {
    const hasStories = pkg.candidateStories.length > 0;
    const lowRank = pkg.candidateStories.every(
      (s) => s.reviewStatus !== "approved" && (s.rankScore ?? 0) < 0.5,
    );
    if (hasStories && lowRank) {
      return { reason: "stories_exist_low_rank_score", canBuildCardsReason: check.reason ?? null };
    }
    return { reason: "insufficient_approved_stories", canBuildCardsReason: check.reason ?? null };
  }
  if (check.reason?.includes("rejected or missing fact")) {
    return { reason: "story_references_bad_fact", canBuildCardsReason: check.reason };
  }
  return { reason: "unknown", canBuildCardsReason: check.reason ?? null };
}

function hasIntelligencePackage(
  status: string | null | undefined,
  storyCardCount: number,
): boolean {
  if (!status) return false;
  if (storyCardCount > 0) return true;
  return status === "published" || status === "cards_ready" || status === "approved";
}

export async function auditPackageCompletion(): Promise<PackageCompletionAudit> {
  const universe = await loadVideoUniverse();
  const { results } = await auditVideoIdentification(universe.videos);
  const owned = new Map<string, { rvtr: string; artist: string; title: string; playCount: number }>();

  for (const id of results) {
    if (!id.rvtr) continue;
    const entry = universe.videos.find((v) => v.filePathNorm === id.filePathNorm);
    if (!entry) continue;
    const rvtr = id.rvtr.toUpperCase();
    const playCount = entry.playCount ?? 0;
    if (!owned.has(rvtr) || playCount > owned.get(rvtr)!.playCount) {
      owned.set(rvtr, { rvtr, artist: entry.artist, title: entry.title, playCount });
    }
  }

  const reasonCounts = new Map<ReviewNoCardsReason, number>();
  const rows: ReviewNoCardsRow[] = [];

  let withPackageFile = 0;
  let reviewNoCards = 0;
  let draftNoCards = 0;
  let alreadyIntelligence = 0;
  let readyForCardAssembly = 0;
  let cardsReady = 0;
  let published = 0;
  let reviewWithCards = 0;

  let tier2 = 0;
  let tier3 = 0;
  let tier4 = 0;
  let tier5 = 0;

  for (const base of owned.values()) {
    const pkg = await loadSongPackage(base.rvtr);
    if (!pkg) continue;
    withPackageFile++;

    const cards = pkg.storyCards.filter((c) => c.rank > 0).length;
    const intel = hasIntelligencePackage(pkg.status, cards);

    if (pkg.status === "cards_ready") cardsReady++;
    if (pkg.status === "published") published++;
    if (intel) alreadyIntelligence++;
    if (pkg.status === "review" && cards > 0) reviewWithCards++;

    if (pkg.status === "draft" && cards === 0) {
      draftNoCards++;
      tier4++;
      continue;
    }

    if (pkg.status !== "review" || cards > 0) continue;

    reviewNoCards++;
    const facts = promoteVerifiedFacts(pkg.candidateFacts);
    const { reason, canBuildCardsReason } = classifyReviewNoCards(pkg);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);

    if (reason === "ready_for_card_assembly") {
      readyForCardAssembly++;
    } else if (reason === "stories_exist_low_rank_score" || reason === "insufficient_approved_stories") {
      tier2++;
    } else if (
      reason === "insufficient_approved_facts" ||
      reason === "story_references_bad_fact"
    ) {
      tier3++;
    } else if (reason === "no_candidate_facts" || reason === "no_candidate_stories" || reason === "process_log_error") {
      tier5++;
    } else {
      tier3++;
    }

    rows.push({
      rvtr: base.rvtr,
      artist: base.artist,
      title: base.title,
      playCount: base.playCount,
      reason,
      approvedFacts: countApprovedFacts(facts),
      approvedStories: pkg.candidateStories.filter((s) => s.reviewStatus === "approved").length,
      candidateFacts: pkg.candidateFacts.length,
      candidateStories: pkg.candidateStories.length,
      researchSources: pkg.researchVault.length,
      lastLogLine: pkg.processLog.at(-1) ?? null,
      canBuildCardsReason,
    });
  }

  rows.sort((a, b) => b.playCount - a.playCount);

  const total789 = reviewNoCards;
  const reasonList = [...reasonCounts.entries()]
    .map(([reason, count]) => ({
      reason,
      label: REASON_LABELS[reason],
      count,
      pct: pct(count, total789),
    }))
    .sort((a, b) => b.count - a.count);

  const projectedIntel =
    alreadyIntelligence + readyForCardAssembly + tier2;

  return {
    scannedAt: new Date().toISOString(),
    ownedCohort: owned.size,
    withPackageFile,
    reviewNoCards: total789,
    reasonCounts: reasonList,
    draftNoCards,
    alreadyIntelligence,
    readyForCardAssembly,
    full1184Path: {
      cardsReady,
      published,
      reviewWithCards,
      reviewNoCardsReady: readyForCardAssembly,
      reviewNoCardsFixable: tier2,
      draftNoCards,
      projectedIntelligenceAfterCardAssembly:
        alreadyIntelligence + readyForCardAssembly,
    },
    effortEstimate: {
      tier1_card_assembly_only: {
        count: readyForCardAssembly,
        effort: "~1–2 sec/pkg, no Ollama, run buildCardsFromReview batch",
      },
      tier2_auto_approve_stories: {
        count: tier2,
        effort: "~5 min/pkg or batch rule change — lower rankScore threshold / manual approve",
      },
      tier3_fact_promotion_or_reextract: {
        count: tier3,
        effort: "~30–90 sec/pkg Ollama re-extract or fact approval pass",
      },
      tier4_draft_reprocess: {
        count: tier4,
        effort: "~45–120 sec/pkg full processSong retry",
      },
      tier5_empty_or_broken: {
        count: tier5,
        effort: "~45–120 sec/pkg full pipeline re-run",
      },
    },
    rows,
  };
}
