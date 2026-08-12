import { normalizeArtistText, normalizeIdentityText } from "../vdj-index";
import type {
  AudioReadinessResult,
  AudioReadinessStatus,
  CandidateEvidence,
  CoverageTargetSong,
  OperatorDecisionEvent,
} from "../types";

const SUPPORTED_EXTENSIONS = new Set(["mp3", "m4a", "aac", "wav", "aiff", "aif", "flac", "ogg", "opus"]);
const SUPPORTED_CODECS = new Set([
  "mp3",
  "aac",
  "alac",
  "flac",
  "vorbis",
  "opus",
  "pcm_s16le",
  "pcm_s24le",
  "pcm_s32le",
  "pcm_f32le",
]);

function bitrate(candidate: CandidateEvidence): number | null {
  return candidate.probe?.streamBitRate ?? candidate.probe?.formatBitRate ?? null;
}

function tagsConflict(candidate: CandidateEvidence, target: CoverageTargetSong): boolean {
  const tags = candidate.probe?.tags;
  if (!tags) return false;
  const expectedArtist = normalizeArtistText(target.artist);
  const expectedTitle = normalizeIdentityText(target.title);
  const actualArtist = normalizeArtistText(tags.artist ?? "");
  const actualTitle = normalizeIdentityText(tags.title ?? "");
  const artistConflict = actualArtist && expectedArtist && actualArtist !== expectedArtist;
  const titleConflict = actualTitle && expectedTitle && actualTitle !== expectedTitle;
  return Boolean(artistConflict || titleConflict);
}

function effectiveStatus(
  automatic: AudioReadinessStatus,
  decision: OperatorDecisionEvent | null,
): AudioReadinessStatus | "skipped" {
  if (!decision || decision.requiresConfirmation) return automatic;
  switch (decision.action) {
    case "mark_ready":
    case "accept_expected_alternate":
      return "ready";
    case "require_listening_review":
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

export function classifyAudioReadiness(input: {
  target: CoverageTargetSong;
  rvtr: string | null;
  candidates: CandidateEvidence[];
  decisionHistory?: OperatorDecisionEvent[];
}): AudioReadinessResult {
  const decisionHistory = input.decisionHistory ?? [];
  const lastDecision = decisionHistory.at(-1) ?? null;
  const currentDecision = lastDecision?.action === "clear_decision" ? null : lastDecision;
  const managed = input.candidates.filter((candidate) => candidate.managedClass === "managed_audio");
  const existing = managed.filter((candidate) => candidate.fileExists && candidate.probe?.ok);
  const compatible = existing.filter((candidate) => candidate.versionCompatible);
  const alternatives = existing.filter((candidate) => !candidate.versionCompatible);
  const ranked = compatible.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));
  const winner = ranked[0] ?? null;
  const runnerUp = ranked[1] ?? null;
  const margin = winner && runnerUp ? winner.score - runnerUp.score : null;
  let automaticStatus: AudioReadinessStatus = "missing";
  let statusReason = "No managed MUSIC entry in VirtualDJ is readable.";
  let reviewReason: string | null = null;
  const warnings: string[] = [];

  if (!winner) {
    if (alternatives.length > 0) {
      automaticStatus = "alternate_only";
      statusReason = "Only incompatible alternate versions are available under managed MUSIC.";
      reviewReason = alternatives[0]?.versionReason ?? "Only alternate versions are available.";
    } else if (managed.some((candidate) => candidate.fileExists === false)) {
      statusReason = "Managed MUSIC XML entries exist, but their local files are missing.";
    } else if (managed.some((candidate) => candidate.probe && !candidate.probe.ok)) {
      statusReason = "Managed MUSIC XML entries exist, but their files are unreadable.";
    }
  } else {
    const probe = winner.probe!;
    const duration = probe.durationSeconds;
    const actualBitRate = bitrate(winner);
    const lossless = probe.lossless === true;
    const codecSupported = Boolean(probe.codecName && SUPPORTED_CODECS.has(probe.codecName));
    const extensionSupported = SUPPORTED_EXTENSIONS.has(winner.extension);

    if (winner.score < 75) {
      warnings.push("Identity confidence is below the likely-match threshold.");
    }
    if (margin != null && margin < 10) warnings.push("Multiple plausible candidates are within 10 points.");
    if (!extensionSupported) warnings.push(`Unusual or unsupported extension: ${winner.extension || "unknown"}.`);
    if (!codecSupported) warnings.push(`Unusual or unsupported codec: ${probe.codecName ?? "unknown"}.`);
    if (duration == null || duration <= 0) warnings.push("Duration is unavailable or invalid.");
    else if (duration < 45 || duration > 1800) warnings.push("Duration is suspiciously short or long.");
    if (
      duration != null &&
      input.target.expectedDurationSeconds != null &&
      input.target.expectedDurationSeconds > 0 &&
      Math.abs(duration - input.target.expectedDurationSeconds) / input.target.expectedDurationSeconds > 0.15
    ) {
      warnings.push("Duration differs from the target evidence by more than 15%.");
    }
    if (probe.channels === 1) warnings.push("Mono requires listening review unless historically expected.");
    if (probe.channels == null || probe.channels < 1) warnings.push("Channel count is unavailable.");
    if (probe.sampleRate != null && ![44100, 48000].includes(probe.sampleRate)) {
      warnings.push(`Unusual sample rate: ${probe.sampleRate} Hz.`);
    }
    if (probe.sampleRate == null) warnings.push("Sample rate is unavailable.");
    if (!lossless && actualBitRate == null) warnings.push("Lossy bitrate is unavailable.");
    if (tagsConflict(winner, input.target)) warnings.push("Container tags conflict with target artist or title.");
    if (winner.versionReason) warnings.push(winner.versionReason);

    const weakBitrate = !lossless && actualBitRate != null && actualBitRate < 128_000;
    const secondWeakSignal =
      (probe.sampleRate != null && probe.sampleRate < 44_100) ||
      probe.channels === 1 ||
      !codecSupported ||
      !extensionSupported;

    if (weakBitrate && secondWeakSignal) {
      automaticStatus = "upgrade_recommended";
      statusReason = "The file is readable but materially weak across multiple technical signals.";
      reviewReason = "Confirm by listening before sourcing any replacement.";
    } else if (warnings.length > 0 || winner.score < 90 || (margin != null && margin < 10)) {
      automaticStatus = "review";
      statusReason = "The file may be usable, but identity or technical evidence needs review.";
      reviewReason = warnings.join(" ");
    } else {
      automaticStatus = "ready";
      statusReason = lossless
        ? "Exact managed MUSIC identity with a readable lossless audio stream."
        : "Exact managed MUSIC identity with acceptable multi-factor audio evidence.";
    }
  }

  return {
    target: input.target,
    rvtr: input.rvtr,
    automaticStatus,
    effectiveStatus: effectiveStatus(automaticStatus, currentDecision),
    statusReason,
    reviewReason,
    technicalWarnings: warnings,
    candidates: input.candidates,
    winnerPath: winner?.filePath ?? alternatives[0]?.filePath ?? null,
    winnerScore: winner?.score ?? alternatives[0]?.score ?? null,
    runnerUpMargin: margin,
    decisionHistory,
    currentDecision,
  };
}
