/**
 * Director 0.3 — template downgrade engine.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import { getSceneTemplate, type SceneTemplateId } from "./scene-template-library";
import { assessLayoutReadiness, layoutReadinessLabel } from "./template-selection";

import type { ExperienceScene, LayoutReadinessStatus } from "./types";

const DOWNGRADE_CHAIN: Partial<Record<SceneTemplateId, SceneTemplateId[]>> = {
  quote: ["story"],
  gallery: ["hero", "story"],
  fact_stack: ["story"],
  timeline: ["story"],
  comparison: ["story"],
  performance: ["story"],
  chart: ["story"],
  story: ["hero"],
};

export type DowngradeResult = {
  templateId: SceneTemplateId;
  downgraded: boolean;
  reason: string | null;
};

function isReady(
  scene: ExperienceScene,
  templateId: SceneTemplateId,
  handoff: DirectorEditorialPackage,
): boolean {
  return assessLayoutReadiness(scene, templateId, handoff) === "ready";
}

/** Pick strongest viable template — never leave scene broken. */
export function resolveFinalTemplate(
  scene: ExperienceScene,
  preferredId: SceneTemplateId,
  handoff: DirectorEditorialPackage,
): DowngradeResult {
  if (isReady(scene, preferredId, handoff)) {
    return { templateId: preferredId, downgraded: false, reason: null };
  }

  const chain = DOWNGRADE_CHAIN[preferredId] ?? ["story"];
  for (const candidate of chain) {
    if (isReady(scene, candidate, handoff)) {
      return {
        templateId: candidate,
        downgraded: true,
        reason: `${getSceneTemplate(preferredId).displayName} → ${getSceneTemplate(candidate).displayName}: ${layoutReadinessLabel(assessLayoutReadiness(scene, preferredId, handoff))}`,
      };
    }
  }

  if (scene.title === "Opening" && isReady(scene, "hero", handoff)) {
    return { templateId: "hero", downgraded: preferredId !== "hero", reason: "Fallback to Hero for opening" };
  }
  if (scene.title === "Closing" && isReady(scene, "closing", handoff)) {
    return {
      templateId: "closing",
      downgraded: preferredId !== "closing",
      reason: "Fallback to Closing for finale",
    };
  }

  return {
    templateId: "story",
    downgraded: preferredId !== "story",
    reason: `${getSceneTemplate(preferredId).displayName} → Story: minimum viable layout`,
  };
}

export function applyDowngradesToScenes(
  scenes: ExperienceScene[],
  handoff: DirectorEditorialPackage,
): { scenes: ExperienceScene[]; downgradesApplied: number } {
  let downgradesApplied = 0;

  const updated = scenes.map((scene) => {
    const preferredId = scene.recommendedTemplate?.templateId ?? "story";
    const result = resolveFinalTemplate(scene, preferredId, handoff);

    if (result.downgraded) downgradesApplied += 1;

    const readiness = assessLayoutReadiness(scene, result.templateId, handoff);

    return {
      ...scene,
      preferredTemplate: scene.recommendedTemplate,
      recommendedTemplate: {
        templateId: result.templateId,
        displayName: getSceneTemplate(result.templateId).displayName,
        confidence: scene.recommendedTemplate?.confidence ?? 80,
        reason: result.reason
          ? `${scene.recommendedTemplate?.reason ?? ""} Final: ${result.reason}`.trim()
          : scene.recommendedTemplate?.reason ?? "",
      },
      templateDowngraded: result.downgraded,
      downgradeReason: result.reason,
      layoutReadiness: readiness,
      layoutReadinessLabel: layoutReadinessLabel(readiness),
    };
  });

  return { scenes: updated, downgradesApplied };
}

export function readinessIsBlocking(status: LayoutReadinessStatus): boolean {
  return status !== "ready";
}
