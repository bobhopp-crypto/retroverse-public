/**
 * Director 0.1 → 3.31 — Experience Plan via storytelling pipeline when Retrograph present.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import { buildMuseumExperiencePlan } from "./exhibit-plan";
import { runStorytellingPipeline } from "./storytelling/run-pipeline";
import type { CoachingRuleHints } from "./coaching/types";

import type { ExperiencePlan } from "./types";

/** Transform Editor handoff + Retrograph into a story-driven experience plan. */
export function buildExperiencePlan(
  handoff: DirectorEditorialPackage,
  coachingHints?: CoachingRuleHints | null,
  retrograph?: Retrograph | null,
): ExperiencePlan {
  if (retrograph) {
    return runStorytellingPipeline(handoff, retrograph, coachingHints).experiencePlan;
  }
  return buildMuseumExperiencePlan(handoff, { includeExtended: true, coachingHints });
}
