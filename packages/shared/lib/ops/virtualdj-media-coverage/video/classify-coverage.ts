import type {
  BillboardTargetSong,
  CandidateEvidence,
  ChartVideoOutcome,
  CoverageDecisionEvent,
  VideoCoverageStatus,
} from "../types";

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "mov",
  "mkv",
  "avi",
  "mpg",
  "mpeg",
  "webm",
  "vob",
  "ts",
  "m2ts",
]);

function currentDecision(history: CoverageDecisionEvent[]): CoverageDecisionEvent | null {
  const last = history.at(-1) ?? null;
  return last?.action === "clear_decision" ? null : last;
}

function effectiveStatus(
  automatic: VideoCoverageStatus,
  decision: CoverageDecisionEvent | null,
): VideoCoverageStatus | "skipped" {
  if (!decision || decision.requiresConfirmation) return automatic;
  switch (decision.action) {
    case "accept_ready":
    case "accept_expected_alternate":
      return "ready";
    case "require_review":
    case "reject_candidate":
      return "review";
    case "mark_missing":
      return "missing";
    case "skip":
      return "skipped";
    case "mark_upgrade_recommended":
      return "review";
    case "clear_decision":
      return automatic;
  }
}

export function classifyVideoCoverage(input: {
  target: BillboardTargetSong;
  candidates: CandidateEvidence[];
  decisionHistory?: CoverageDecisionEvent[];
}): ChartVideoOutcome {
  const decisionHistory = (input.decisionHistory ?? []).filter((event) => event.axis === "video");
  const decision = currentDecision(decisionHistory);
  const managed = input.candidates.filter((candidate) => candidate.managedClass === "managed_video");
  const existing = managed.filter((candidate) => candidate.fileExists === true);
  const compatible = existing
    .filter((candidate) => candidate.versionCompatible)
    .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));
  const alternatives = existing
    .filter((candidate) => !candidate.versionCompatible)
    .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));
  const winner = compatible[0] ?? null;
  const runnerUp = compatible[1] ?? null;
  const margin = winner && runnerUp ? winner.score - runnerUp.score : null;
  const warnings: string[] = [];
  let automaticStatus: VideoCoverageStatus = "missing";
  let statusReason = "No eligible managed VIDEO entry exists in the VirtualDJ inventory.";
  let reviewReason: string | null = null;
  let winnerPath: string | null = null;
  let winnerScore: number | null = null;

  if (!winner) {
    const alternate = alternatives[0] ?? null;
    if (alternate) {
      winnerPath = alternate.filePath;
      winnerScore = alternate.score;
      const exactCanonicalAlternate = ["exact_rvtr", "structured_relationship"].includes(
        alternate.matchMethod,
      );
      if (exactCanonicalAlternate) {
        automaticStatus = "review";
        statusReason = "Exact canonical identity exists only as an incompatible video version.";
        reviewReason = alternate.versionReason ?? "The exact canonical candidate has incompatible version evidence.";
      } else {
        automaticStatus = "alternate_only";
        statusReason = "Only incompatible alternate videos are present under managed VIDEO.";
        reviewReason = alternate.versionReason ?? "Only alternate video versions are present.";
      }
    } else if (managed.some((candidate) => candidate.fileExists === false)) {
      statusReason = "Managed VIDEO XML entries exist, but their local files are missing.";
    }
  } else {
    winnerPath = winner.filePath;
    winnerScore = winner.score;
    if (winner.score < 90) warnings.push("Video identity is likely rather than exact.");
    if (margin != null && margin < 10) warnings.push("Multiple plausible video candidates are within 10 points.");
    if (!VIDEO_EXTENSIONS.has(winner.extension)) {
      warnings.push(`The managed VIDEO candidate has a non-video extension: ${winner.extension || "unknown"}.`);
    }
    if (input.target.unresolvedIdentity) {
      warnings.push("The Billboard canonical identity is unresolved.");
    }
    if (winner.versionReason) warnings.push(winner.versionReason);

    if (warnings.length > 0 || winner.score < 90 || (margin != null && margin < 10)) {
      automaticStatus = "review";
      statusReason = "A managed VIDEO candidate exists, but identity or version evidence needs review.";
      reviewReason = warnings.join(" ");
    } else {
      automaticStatus = "ready";
      statusReason = "Exact compatible identity exists as a local managed VIDEO file.";
    }
  }

  return {
    automaticStatus,
    effectiveStatus: effectiveStatus(automaticStatus, decision),
    statusReason,
    reviewReason,
    warnings,
    winnerPath,
    winnerScore,
    runnerUpMargin: margin,
    decisionHistory,
    currentDecision: decision,
  };
}
