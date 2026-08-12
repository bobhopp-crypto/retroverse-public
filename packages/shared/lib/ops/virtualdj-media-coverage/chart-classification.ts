import { classifyAudioReadiness } from "./audio/classify-readiness";
import type {
  AudioReadinessStatus,
  BillboardTargetSong,
  CandidateEvidence,
  ChartAudioOutcome,
  ChartCoverageResult,
  ChartCoverageSummary,
  CoverageDecisionEvent,
} from "./types";

function currentAudioDecision(history: CoverageDecisionEvent[]): CoverageDecisionEvent | null {
  const last = history.at(-1) ?? null;
  return last?.action === "clear_decision" ? null : last;
}

function effectiveAudioStatus(
  automatic: AudioReadinessStatus,
  decision: CoverageDecisionEvent | null,
): AudioReadinessStatus | "skipped" {
  if (!decision || decision.requiresConfirmation) return automatic;
  switch (decision.action) {
    case "accept_ready":
    case "accept_expected_alternate":
      return "ready";
    case "require_review":
    case "reject_candidate":
      return "review";
    case "mark_upgrade_recommended":
      return "upgrade_recommended";
    case "mark_missing":
      return "missing";
    case "skip":
      return "skipped";
    case "clear_decision":
      return automatic;
  }
}

export function classifyChartAudio(input: {
  target: BillboardTargetSong;
  rvtr: string | null;
  candidates: CandidateEvidence[];
  decisionHistory?: CoverageDecisionEvent[];
}): ChartAudioOutcome {
  const decisionHistory = (input.decisionHistory ?? []).filter((event) => event.axis === "audio");
  const automatic = classifyAudioReadiness({
    target: input.target,
    rvtr: input.rvtr,
    candidates: input.candidates,
  });
  const decision = currentAudioDecision(decisionHistory);
  return {
    automaticStatus: automatic.automaticStatus,
    effectiveStatus: effectiveAudioStatus(automatic.automaticStatus, decision),
    statusReason: automatic.statusReason,
    reviewReason: automatic.reviewReason,
    technicalWarnings: automatic.technicalWarnings,
    winnerPath: automatic.winnerPath,
    winnerScore: automatic.winnerScore,
    runnerUpMargin: automatic.runnerUpMargin,
    decisionHistory,
    currentDecision: decision,
  };
}

export function summarizeChartCoverage(
  results: ChartCoverageResult[],
): ChartCoverageSummary {
  const summary: ChartCoverageSummary = {
    targetSongs: results.length,
    unresolvedIdentities: 0,
    audioReady: 0,
    audioReview: 0,
    audioUpgradeRecommended: 0,
    audioAlternateOnly: 0,
    audioMissing: 0,
    videoReady: 0,
    videoReview: 0,
    videoAlternateOnly: 0,
    videoMissing: 0,
    audioDecisions: 0,
    videoDecisions: 0,
    skipped: 0,
  };

  for (const result of results) {
    if (result.target.unresolvedIdentity) summary.unresolvedIdentities += 1;
    switch (result.audio.effectiveStatus) {
      case "ready":
        summary.audioReady += 1;
        break;
      case "review":
        summary.audioReview += 1;
        break;
      case "upgrade_recommended":
        summary.audioUpgradeRecommended += 1;
        break;
      case "alternate_only":
        summary.audioAlternateOnly += 1;
        break;
      case "missing":
        summary.audioMissing += 1;
        break;
      case "skipped":
        summary.skipped += 1;
        break;
    }
    switch (result.video.effectiveStatus) {
      case "ready":
        summary.videoReady += 1;
        break;
      case "review":
        summary.videoReview += 1;
        break;
      case "alternate_only":
        summary.videoAlternateOnly += 1;
        break;
      case "missing":
        summary.videoMissing += 1;
        break;
      case "skipped":
        break;
    }
    if (result.audio.currentDecision) summary.audioDecisions += 1;
    if (result.video.currentDecision) summary.videoDecisions += 1;
  }
  return summary;
}
