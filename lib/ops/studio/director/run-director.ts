/**
 * Director — design the Retroverse experience blueprint from Editor handoff.
 * Reads Retrograph + handoff — never mutates Retrograph.
 */

import type { CoachingRuleHints } from "./coaching/types";
import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import { applySceneTemplates } from "./apply-scene-templates";
import { buildRenderSpec } from "./build-render-spec";
import { buildMuseumExperiencePlan } from "./exhibit-plan";
import { applyExhibitTemplates } from "./exhibit-templates";
import { buildDirectorReview } from "./review";
import { runStorytellingPipeline } from "./storytelling/run-pipeline";
import { formatSequenceViolationsForReview } from "./storytelling/enforce-sequence-variety";
import { applyDowngradesToScenes } from "./template-downgrade";
import type { DirectorPackage } from "./types";
import { applyVarietyEngine, type VarietyAdjustment } from "./variety-engine";

export function runDirectorOnHandoff(
  handoff: DirectorEditorialPackage,
  coachingHints?: CoachingRuleHints | null,
  retrograph?: Retrograph | null,
  options?: { hasSongDna?: boolean },
): DirectorPackage {
  let storyPlan: DirectorPackage["storyPlan"];
  let sequenceViolations: string[] = [];

  let basePlan;
  if (retrograph) {
    const result = runStorytellingPipeline(handoff, retrograph, coachingHints, {
      hasSongDna: options?.hasSongDna,
    });
    storyPlan = result.storyPlan;
    basePlan = result.experiencePlan;
    sequenceViolations = formatSequenceViolationsForReview(result.sequenceViolations);
  } else {
    basePlan = buildMuseumExperiencePlan(handoff, { includeExtended: true, coachingHints });
  }

  const isStoryPlan =
    basePlan.templateLibraryVersion?.includes("storytelling") === true ||
    basePlan.templateLibraryVersion?.includes("retrograph") === true ||
    basePlan.templateLibraryVersion?.includes("dossier") === true;

  const withExhibitTemplates = isStoryPlan
    ? basePlan
    : applyExhibitTemplates(handoff, basePlan);
  const withTemplates = isStoryPlan
    ? withExhibitTemplates
    : applySceneTemplates(handoff, withExhibitTemplates);

  const { scenes: downgradedScenes, downgradesApplied } = isStoryPlan
    ? { scenes: withTemplates.scenes, downgradesApplied: 0 }
    : applyDowngradesToScenes(withTemplates.scenes, handoff);
  const afterDowngrade = { ...withTemplates, version: "0.3" as const, scenes: downgradedScenes };

  const { plan: afterVariety, adjustments } = isStoryPlan
    ? { plan: afterDowngrade, adjustments: [] as VarietyAdjustment[] }
    : applyVarietyEngine(handoff, afterDowngrade);

  const review = buildDirectorReview(handoff, afterVariety, {
    downgradesApplied,
    varietyAdjustments: adjustments,
  });

  if (isStoryPlan && sequenceViolations.length > 0) {
    review.warnings = [
      ...sequenceViolations,
      ...review.warnings.filter((w) => !/consecutive "Story"/i.test(w)),
    ];
  }

  const renderSpec = buildRenderSpec(handoff, afterVariety, review, {
    downgradesApplied,
    varietyAdjustmentsApplied: adjustments.length,
  });

  return {
    version: "0.3",
    rvtr: handoff.rvtr.trim().toUpperCase(),
    artist: handoff.artist,
    title: handoff.title,
    generatedAt: new Date().toISOString(),
    handoffVersion: handoff.version,
    experiencePlan: afterVariety,
    storyPlan,
    review,
    renderSpec,
  };
}
