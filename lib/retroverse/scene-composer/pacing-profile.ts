import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

import type { PacingProfile, PacingProfileId, VisualIntensity } from "./types";
import { PACING_PROFILE_LABELS } from "./types";

function includesAny(haystack: string, needles: string[]): boolean {
  const n = haystack.toLowerCase();
  return needles.some((needle) => n.includes(needle.toLowerCase()));
}

export function derivePacingProfile(
  dna: CollectorSongDna | null,
  sceneCount: number,
): PacingProfile {
  const experience = dna?.experience;
  const pace = experience?.readingPace ?? "Measured";
  const energy = experience?.visualEnergy ?? "";
  const rhythm = experience?.sceneRhythm ?? "";
  const layout = experience?.preferredLayoutStyle ?? "";

  let id: PacingProfileId = "steady";
  let reason = "Default steady rhythm when Song DNA is neutral.";

  if (includesAny(layout, ["immersive", "stage"])) {
    id = "concert";
    reason = "Immersive stage layout preference maps to concert pacing.";
  } else if (includesAny(rhythm, ["documentary"]) || includesAny(layout, ["documentary"])) {
    id = "documentary";
    reason = "Documentary scene rhythm favors measured narrative beats.";
  } else if (includesAny(layout, ["magazine"])) {
    id = "magazine";
    reason = "Magazine layout preference suits editorial page-turn pacing.";
  } else if (includesAny(pace, ["leisurely"]) || includesAny(energy, ["low", "still"])) {
    id = includesAny(experience?.overallMood ?? "", ["reflect"]) ? "reflective" : "slow_build";
    reason = includesAny(pace, ["leisurely"])
      ? "Leisurely reading pace opens a slow-build arc."
      : "Low visual energy supports reflective pacing.";
  } else if (includesAny(pace, ["brisk"]) && includesAny(energy, ["high", "kinetic"])) {
    id = sceneCount >= 6 ? "accelerating" : "high_energy";
    reason = "Brisk pace with high energy pushes an accelerating arc.";
  } else if (includesAny(energy, ["high", "kinetic"])) {
    id = "high_energy";
    reason = "High kinetic energy favors punchy moment spacing.";
  }

  return { id, label: PACING_PROFILE_LABELS[id], reason };
}

export function intensityForIndex(
  index: number,
  total: number,
  profileId: PacingProfileId,
  momentType: string,
): VisualIntensity {
  if (momentType === "visual_break" || momentType === "pause_moment") return "low";
  if (momentType === "hero_moment" || momentType === "performance_spotlight") return "high";

  const t = total <= 1 ? 1 : index / (total - 1);

  if (profileId === "slow_build") {
    if (t < 0.35) return "low";
    if (t < 0.7) return "medium";
    return "high";
  }
  if (profileId === "accelerating") {
    if (t < 0.25) return "low";
    if (t < 0.55) return "medium";
    return "high";
  }
  if (profileId === "high_energy" || profileId === "concert") {
    return t > 0.85 ? "medium" : "high";
  }
  if (profileId === "reflective" || profileId === "documentary") {
    return index === 0 || index === total - 1 ? "medium" : "low";
  }
  return "medium";
}
