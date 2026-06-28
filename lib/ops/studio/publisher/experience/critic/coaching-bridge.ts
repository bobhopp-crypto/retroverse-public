import "server-only";

import type { ExhibitId } from "@/lib/ops/studio/director/exhibit-plan";
import type { CoachingRuleHints } from "@/lib/ops/studio/director/coaching/types";

import { listGoldenPackages } from "../store";
import type { ExperienceCriticObservation, ExperienceCriticReport } from "./types";

const OBSERVATION_COACHING: Array<{
  pattern: RegExp;
  exhibitId: ExhibitId;
  reason: string;
  avoidCategories?: string[];
  preferCategories?: string[];
}> = [
  {
    pattern: /opening could be stronger|chart journey is visually stronger|leading with curiosity/i,
    exhibitId: "cover",
    reason: "Wrong opening image",
    preferCategories: ["hero", "performance", "close-up"],
    avoidCategories: ["crowd"],
  },
  {
    pattern: /iconic moment should use a different frame/i,
    exhibitId: "iconic_moment",
    reason: "Wrong iconic frame",
    preferCategories: ["close-up", "alternate"],
  },
  {
    pattern: /repeat|same visual|same frame|similar shots/i,
    exhibitId: "iconic_moment",
    reason: "Feels repetitive",
    preferCategories: ["alternate", "close-up"],
    avoidCategories: ["performance", "hero"],
  },
  {
    pattern: /rhythm breaks|rhythm feels static|same layout/i,
    exhibitId: "chart_journey",
    reason: "Wrong pacing",
  },
  {
    pattern: /performance feels weaker|stronger closing frame|abrupt/i,
    exhibitId: "performance",
    reason: "Performance frame isn't memorable",
    preferCategories: ["performance", "close-up"],
    avoidCategories: ["crowd", "wide"],
  },
  {
    pattern: /visual variety|texture could add/i,
    exhibitId: "performance",
    reason: "Poor visual variety",
    preferCategories: ["alternate", "close-up", "crowd"],
  },
  {
    pattern: /reflection|song dna|emotion stage is missing/i,
    exhibitId: "song_dna",
    reason: "Not enough emotion",
  },
];

function normalizeCategory(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

function applyObservationToHints(
  hints: CoachingRuleHints,
  observation: ExperienceCriticObservation,
): CoachingRuleHints {
  const rules = OBSERVATION_COACHING.filter((r) => r.pattern.test(observation.text));
  if (rules.length === 0) return hints;

  const preferred = new Set(hints.preferredCategories);
  const avoid = new Set(hints.avoidCategories);
  const reasonCounts = { ...hints.reasonCounts };

  for (const rule of rules) {
    reasonCounts[rule.reason] = (reasonCounts[rule.reason] ?? 0) + 1;
    if (observation.tone === "concern" || observation.tone === "note") {
      for (const cat of rule.avoidCategories ?? []) {
        avoid.add(normalizeCategory(cat));
      }
      for (const cat of rule.preferCategories ?? []) {
        preferred.add(normalizeCategory(cat));
      }
    }
  }

  return {
    preferredCategories: [...preferred],
    avoidCategories: [...avoid],
    reasonCounts,
  };
}

/** Merge Experience Critic observations into Director coaching hints for the next run. */
export function mergeCriticIntoCoachingHints(
  base: CoachingRuleHints,
  critic: ExperienceCriticReport | null | undefined,
): CoachingRuleHints {
  if (!critic?.observations.length) return base;

  return critic.observations.reduce(
    (hints, observation) => applyObservationToHints(hints, observation),
    base,
  );
}

/** Golden exemplars — praise patterns become soft preferences for future Director runs. */
export async function mergeGoldenCriticIntoCoachingHints(
  base: CoachingRuleHints,
): Promise<CoachingRuleHints> {
  const golden = await listGoldenPackages();
  let hints = base;

  for (const pkg of golden) {
    if (!pkg.criticObservations?.length) continue;
    for (const observation of pkg.criticObservations) {
      if (observation.tone !== "praise") continue;
      hints = applyObservationToHints(hints, observation);
    }
  }

  return hints;
}
