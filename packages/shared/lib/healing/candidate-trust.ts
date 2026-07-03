import { assessCompilationRisk } from "@/lib/healing/compilation-risk";
import type { HealingDuplicateClusterRef } from "@/lib/healing/load-degraded-queue";
import type { ScoredAlbumLinkCandidate } from "@/lib/track/album-link-recovery/types";

export type CandidateTrustLevel = "trusted" | "cautious" | "risky";

export type CandidateTrustAssessment = {
  level: CandidateTrustLevel;
  trustScore: number;
  matchConfidence: number;
  riskFlags: string[];
  strengthFlags: string[];
  compilation: ReturnType<typeof assessCompilationRisk>;
  curatorNote: string;
};

export type CandidateTrustContext = {
  trackTitle: string;
  artistName: string;
  firstChartYear: number | null;
  duplicateCluster: HealingDuplicateClusterRef | null;
  rvtr: string;
};

function yearDelta(trackYear: number | null, albumYear: number | null): number | null {
  if (trackYear == null || albumYear == null) return null;
  return Math.abs(trackYear - albumYear);
}

export function assessCandidateTrust(
  candidate: ScoredAlbumLinkCandidate,
  ctx: CandidateTrustContext,
): CandidateTrustAssessment {
  const compilation = assessCompilationRisk(candidate.albumTitle, candidate.artistName);
  const riskFlags: string[] = [];
  const strengthFlags: string[] = [];
  let trustScore = candidate.confidence;

  const sameArtist =
    candidate.artistName.trim().toLowerCase() === ctx.artistName.trim().toLowerCase();
  if (sameArtist) {
    strengthFlags.push("same_canonical_artist");
    trustScore += 0.05;
  } else {
    riskFlags.push("different_artist_compilation_or_cover");
    trustScore -= 0.25;
  }

  const delta = yearDelta(ctx.firstChartYear, candidate.releaseYear);
  if (delta != null) {
    if (delta <= 2) {
      strengthFlags.push("release_year_aligned");
      trustScore += 0.08;
    } else if (delta <= 5) {
      strengthFlags.push("release_year_close");
    } else if (delta > 8) {
      riskFlags.push(`release_year_delta_${delta}`);
      trustScore -= 0.15;
    }
  }

  if (candidate.reasons.includes("album_tracklist_title_matches")) {
    strengthFlags.push("tracklist_title_match");
    trustScore += 0.05;
  }
  if (candidate.reasons.includes("canonical_track_album_link_bridge")) {
    strengthFlags.push("canonical_bridge");
  }

  if (compilation.level === "high") {
    riskFlags.push("compilation_or_soundtrack");
    trustScore -= 0.2;
  } else if (compilation.level === "low") {
    riskFlags.push("probable_compilation");
    trustScore -= 0.1;
  }

  if (ctx.duplicateCluster && ctx.duplicateCluster.probableCanonicalRvtr !== ctx.rvtr) {
    riskFlags.push("duplicate_rvtr_fragment");
    trustScore -= 0.12;
  }
  if (ctx.duplicateCluster && ctx.duplicateCluster.clusterSize > 2) {
    riskFlags.push("duplicate_cluster_distortion");
    trustScore -= 0.05;
  }

  if (candidate.existingRvtrOnSlot && candidate.existingRvtrOnSlot !== ctx.rvtr) {
    riskFlags.push("slot_occupied_by_other_rvtr");
    trustScore -= 0.2;
  }

  if (candidate.confidence < 0.45) {
    riskFlags.push("below_approval_threshold");
  }

  trustScore = Math.max(0, Math.min(1, Math.round(trustScore * 1000) / 1000));

  let level: CandidateTrustLevel = "cautious";
  if (trustScore >= 0.72 && riskFlags.length <= 1 && !riskFlags.includes("different_artist_compilation_or_cover")) {
    level = "trusted";
  } else if (
    trustScore < 0.5 ||
    riskFlags.includes("different_artist_compilation_or_cover") ||
    riskFlags.includes("compilation_or_soundtrack") ||
    riskFlags.includes("slot_occupied_by_other_rvtr")
  ) {
    level = "risky";
  }

  const curatorNote =
    level === "trusted"
      ? "Strong pattern — verify era, then approve if album is correct."
      : level === "cautious"
        ? "Mixed signals — human must confirm album era and artist intent."
        : "High false-positive risk — do not approve without deep review.";

  return {
    level,
    trustScore,
    matchConfidence: candidate.confidence,
    riskFlags,
    strengthFlags,
    compilation,
    curatorNote,
  };
}

export function attachTrustToCandidates(
  candidates: ScoredAlbumLinkCandidate[],
  ctx: CandidateTrustContext,
): Array<ScoredAlbumLinkCandidate & { trust: CandidateTrustAssessment }> {
  return candidates.map((c) => ({
    ...c,
    trust: assessCandidateTrust(c, ctx),
  }));
}
