import type { VersionMarker } from "./types";

const MARKERS: Array<[VersionMarker, RegExp]> = [
  ["karaoke", /\bkaraoke\b/i],
  ["tribute", /\btribute\b/i],
  ["re_recording", /\b(re[- ]?record(?:ed|ing)?|new recording)\b/i],
  ["instrumental", /\binstrumental\b/i],
  ["demo", /\bdemo\b/i],
  ["cover", /\bcover(?: version)?\b/i],
  ["live", /\b(live|concert|festival|unplugged)\b/i],
  ["remix", /\b(remix|mix)\b/i],
  ["extended", /\bextended\b/i],
  ["acoustic", /\bacoustic\b/i],
  ["edit", /\b(edit|radio edit|single edit|short version)\b/i],
  ["remaster", /\b(remaster(?:ed)?|anniversary edition)\b/i],
  ["clean", /\bclean\b/i],
  ["explicit", /\bexplicit\b/i],
];

const HARD_ALTERNATES = new Set<VersionMarker>([
  "karaoke",
  "cover",
  "tribute",
  "re_recording",
  "instrumental",
  "demo",
  "live",
  "remix",
  "extended",
  "acoustic",
]);

export function extractVersionMarkers(...values: Array<string | null | undefined>): VersionMarker[] {
  const text = values.filter(Boolean).join(" ");
  const found = MARKERS.filter(([, pattern]) => pattern.test(text)).map(([marker]) => marker);
  if (found.length === 0) return ["original"];
  return [...new Set(found)];
}

export function versionCompatibility(input: {
  requested: VersionMarker[];
  candidate: VersionMarker[];
  targetDurationSeconds?: number | null;
  candidateDurationSeconds?: number | null;
}): { compatible: boolean; score: number; reason: string | null } {
  const requested = new Set(input.requested);
  const candidate = new Set(input.candidate);
  for (const marker of candidate) {
    if (HARD_ALTERNATES.has(marker) && !requested.has(marker)) {
      return { compatible: false, score: -45, reason: `${marker} is not requested by the target` };
    }
  }

  if (candidate.has("edit") && !requested.has("edit")) {
    const targetDuration = input.targetDurationSeconds ?? null;
    const candidateDuration = input.candidateDurationSeconds ?? null;
    if (
      targetDuration != null &&
      candidateDuration != null &&
      Math.abs(candidateDuration - targetDuration) / Math.max(targetDuration, 1) > 0.1
    ) {
      return { compatible: false, score: -20, reason: "edit duration materially differs from target" };
    }
    return { compatible: true, score: -5, reason: "edit requires duration/listening review" };
  }

  if (candidate.has("remaster")) {
    return { compatible: true, score: 0, reason: "remaster is compatible but remains visible" };
  }
  return { compatible: true, score: 5, reason: null };
}

