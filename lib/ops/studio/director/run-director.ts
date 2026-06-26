/**
 * Director 0.3 — run pipeline: handoff → Experience Plan → render spec → director.json
 * Reads Editor handoff only — never Collector.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import { applySceneTemplates } from "./apply-scene-templates";
import { buildRenderSpec } from "./build-render-spec";
import { buildExperiencePlan } from "./experience-plan";
import { buildDirectorReview } from "./review";
import { applyDowngradesToScenes } from "./template-downgrade";
import type { DirectorPackage } from "./types";
import { applyVarietyEngine } from "./variety-engine";

export function runDirectorOnHandoff(handoff: DirectorEditorialPackage): DirectorPackage {
  const basePlan = buildExperiencePlan(handoff);
  const withTemplates = applySceneTemplates(handoff, basePlan);

  const { scenes: downgradedScenes, downgradesApplied } = applyDowngradesToScenes(
    withTemplates.scenes,
    handoff,
  );
  const afterDowngrade = { ...withTemplates, version: "0.3" as const, scenes: downgradedScenes };

  const { plan: afterVariety, adjustments } = applyVarietyEngine(handoff, afterDowngrade);

  const review = buildDirectorReview(handoff, afterVariety, {
    downgradesApplied,
    varietyAdjustments: adjustments,
  });

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
    review,
    renderSpec,
  };
}
