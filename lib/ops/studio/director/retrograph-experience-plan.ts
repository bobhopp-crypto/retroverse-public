/** @deprecated Sprint 3.31 — use `./storytelling/run-pipeline` */
import { runStorytellingPipeline } from "./storytelling/run-pipeline";
import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import type { CoachingRuleHints } from "./coaching/types";
import type { ExperiencePlan } from "./types";

export function buildRetrographExperiencePlan(
  handoff: DirectorEditorialPackage,
  retrograph: Retrograph,
  coachingHints?: CoachingRuleHints | null,
): ExperiencePlan {
  return runStorytellingPipeline(handoff, retrograph, coachingHints).experiencePlan;
}

/** @deprecated */
export const buildDossierExperiencePlan = buildRetrographExperiencePlan;
