import { classifyYouTubeCandidate } from "./classify-candidate";
import { stripThePrefix } from "./filenames";
import type { CandidateType, ConfidenceDecision, ConfidenceGateResult, VideoCandidate } from "./types";

const REJECT_TITLE_PATTERNS =
  /\b(karaoke|cover version|cover by|reaction video|reaction to|tutorial|how to play|fan edit|fan made|8d audio|8d\b|sped up|slowed(?:\+|\s)?reverb)\b/i;

const VERSION_CONFLICT_PATTERNS =
  /\b(live at|live from|live performance|unplugged|concert|festival|lyric video|lyrics video|visualizer|visualiser|audio only|official audio)\b/i;

function normalizeTokens(value: string): string[] {
  return stripThePrefix(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function tokenOverlap(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  let hits = 0;
  for (const token of left) {
    if (rightSet.has(token)) hits += 1;
  }
  return hits / Math.max(left.length, right.length);
}

function isTrustedChannel(artist: string, channel: string): boolean {
  const channelLower = channel.trim().toLowerCase();
  const hay = `${artist} ${channel}`.toLowerCase();
  if (channelLower.includes("vevo") || /\bvevo\b/.test(hay)) return true;
  if (/\s-\s*topic$/i.test(channel.trim()) || channelLower.endsWith(" - topic")) {
    return true;
  }
  if (/\brecords\b|\bmusic\b|\bentertainment\b|\blabel\b/.test(channelLower)) return true;
  const artistTokens = normalizeTokens(artist);
  const channelTokens = normalizeTokens(channel);
  return tokenOverlap(artistTokens, channelTokens) >= 0.5;
}

function artistAgreement(
  artist: string,
  candidate: VideoCandidate,
): "strong" | "partial" | "conflict" {
  const artistTokens = normalizeTokens(artist);
  const titleTokens = normalizeTokens(candidate.title);
  const channelTokens = normalizeTokens(candidate.channel);
  const titleScore = tokenOverlap(artistTokens, titleTokens);
  const channelScore = tokenOverlap(artistTokens, channelTokens);
  const artistInTitle = artistTokens.length > 0 && artistTokens.every((token) => titleTokens.includes(token));
  if (isTrustedChannel(artist, candidate.channel) || artistInTitle || titleScore >= 0.5 || channelScore >= 0.5) {
    return "strong";
  }
  if (titleScore >= 0.25 || channelScore >= 0.25) return "partial";
  return "conflict";
}

function titleAgreement(title: string, candidate: VideoCandidate): "strong" | "partial" | "missing" {
  const titleTokens = normalizeTokens(title);
  const candidateTokens = normalizeTokens(candidate.title);
  if (!titleTokens.length) return "missing";
  const hits = titleTokens.filter((token) => candidateTokens.includes(token)).length;
  const coverage = hits / titleTokens.length;
  if (coverage >= 0.9) return "strong";
  if (coverage >= 0.5) return "partial";
  return "missing";
}

function durationAssessment(
  expectedSeconds: number | null | undefined,
  actualSeconds: number | null,
): "ok" | "review" | "reject" {
  if (actualSeconds == null || actualSeconds <= 0) return "review";
  if (actualSeconds < 25 && actualSeconds < 120) return "reject";
  if (expectedSeconds == null || expectedSeconds <= 0) {
    if (actualSeconds < 45) return "reject";
    if (actualSeconds > 900) return "review";
    return "ok";
  }
  const ratio = actualSeconds / expectedSeconds;
  if (ratio < 0.35 || ratio > 2.5) return "reject";
  if (ratio < 0.65 || ratio > 1.75) return "review";
  return "ok";
}

function rejectReasonsForType(candidateType: CandidateType): string[] {
  switch (candidateType) {
    case "audio_only_upload":
      return ["Audio-only upload"];
    case "lyric_video":
      return ["Lyric video"];
    case "visualizer":
      return ["Visualizer"];
    default:
      return [];
  }
}

function reviewReasonsForType(candidateType: CandidateType): string[] {
  switch (candidateType) {
    case "official_live_performance":
      return ["Official live performance"];
    case "television_performance":
      return ["Television performance"];
    case "concert_footage":
      return ["Concert footage"];
    case "fan_upload":
      return ["Fan upload channel"];
    case "unknown":
      return ["Unknown candidate type"];
    default:
      return [];
  }
}

export function evaluateCandidateConfidence(input: {
  artist: string;
  title: string;
  expectedDurationSeconds?: number | null;
  candidate: VideoCandidate;
  alreadyOwned?: boolean;
  duplicateYoutubeId?: boolean;
}): ConfidenceGateResult {
  const reasons: string[] = [];
  const candidateType = input.candidate.candidateType ?? classifyYouTubeCandidate(
    input.candidate.title,
    input.candidate.channel,
    input.candidate.durationSeconds,
  );
  const candidate = { ...input.candidate, candidateType };

  if (input.alreadyOwned) {
    return {
      decision: "reject",
      reasons: ["Local video already owned"],
      candidate,
      alternateCount: 0,
    };
  }
  if (input.duplicateYoutubeId) {
    return {
      decision: "reject",
      reasons: ["YouTube ID already recorded for another RVTR"],
      candidate,
      alternateCount: 0,
    };
  }

  reasons.push(...rejectReasonsForType(candidateType));
  if (REJECT_TITLE_PATTERNS.test(`${candidate.title} ${candidate.channel}`)) {
    reasons.push("Rejected title/channel pattern");
  }

  const artistMatch = artistAgreement(input.artist, candidate);
  if (artistMatch === "conflict") reasons.push("Conflicting artist/channel match");

  const titleMatch = titleAgreement(input.title, candidate);
  if (titleMatch === "missing") reasons.push("Weak title match");

  const duration = durationAssessment(input.expectedDurationSeconds ?? null, candidate.durationSeconds);
  if (duration === "reject") reasons.push("Implausible duration");
  if (duration === "review") reasons.push("Duration mismatch");

  if (VERSION_CONFLICT_PATTERNS.test(`${candidate.title} ${candidate.channel}`)) {
    reasons.push("Conflicting version terms");
  }

  if (reasons.some((reason) => reason.includes("Audio-only") || reason.includes("Lyric") || reason.includes("Visualizer"))) {
    return { decision: "reject", reasons, candidate, alternateCount: 0 };
  }
  if (reasons.includes("Conflicting artist/channel match") || reasons.includes("Implausible duration")) {
    return { decision: "reject", reasons, candidate, alternateCount: 0 };
  }
  if (reasons.includes("Rejected title/channel pattern")) {
    return { decision: "reject", reasons, candidate, alternateCount: 0 };
  }

  const reviewReasons = reviewReasonsForType(candidateType);
  if (reviewReasons.length) reasons.push(...reviewReasons);

  const autoEligible =
    candidateType === "official_music_video" &&
    artistMatch === "strong" &&
    (titleMatch === "strong" || titleMatch === "partial") &&
    isTrustedChannel(input.artist, candidate.channel) &&
    duration === "ok" &&
    !reasons.includes("Conflicting version terms");

  if (autoEligible) {
    return { decision: "auto", reasons: ["Official music video with trusted channel and matching metadata"], candidate, alternateCount: 0 };
  }

  if (
    reviewReasons.length ||
    duration === "review" ||
    titleMatch === "partial" ||
    artistMatch === "partial" ||
    candidateType === "fan_upload" ||
    candidateType === "unknown"
  ) {
    return { decision: "review", reasons: reasons.length ? reasons : ["Uncertain candidate"], candidate, alternateCount: 0 };
  }

  return { decision: "review", reasons: reasons.length ? reasons : ["Defaulted to review"], candidate, alternateCount: 0 };
}

export function rankCandidatesForBatch(input: {
  artist: string;
  title: string;
  expectedDurationSeconds?: number | null;
  candidates: VideoCandidate[];
  alreadyOwned?: boolean;
  recordedYoutubeIds?: Set<string>;
}): {
  auto: ConfidenceGateResult | null;
  review: ConfidenceGateResult[];
  reject: ConfidenceGateResult[];
} {
  const auto: ConfidenceGateResult[] = [];
  const review: ConfidenceGateResult[] = [];
  const reject: ConfidenceGateResult[] = [];

  for (const candidate of input.candidates) {
    const result = evaluateCandidateConfidence({
      artist: input.artist,
      title: input.title,
      expectedDurationSeconds: input.expectedDurationSeconds,
      candidate,
      alreadyOwned: input.alreadyOwned,
      duplicateYoutubeId: input.recordedYoutubeIds?.has(candidate.videoId) ?? false,
    });
    if (result.decision === "auto") auto.push(result);
    else if (result.decision === "review") review.push(result);
    else reject.push(result);
  }

  const bestAuto = auto[0] ?? null;
  if (bestAuto) {
    bestAuto.alternateCount = auto.length - 1 + review.length;
  }
  for (const item of review) {
    item.alternateCount = Math.max(0, input.candidates.length - 1);
  }
  return { auto: bestAuto, review, reject };
}

export function summarizeConfidenceDecision(decision: ConfidenceDecision | null): string {
  switch (decision) {
    case "auto":
      return "Auto";
    case "review":
      return "Review";
    case "reject":
      return "Reject";
    default:
      return "Pending";
  }
}
