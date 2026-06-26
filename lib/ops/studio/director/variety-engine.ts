/**
 * Director 0.3 — variety engine — reduce repetitive template runs.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import { getSceneTemplate, type SceneTemplateId } from "./scene-template-library";
import { resolveFinalTemplate } from "./template-downgrade";
import { assessLayoutReadiness } from "./template-selection";

import type { ExperiencePlan, ExperienceScene } from "./types";

export type VarietyAdjustment = {
  sceneNumber: number;
  fromTemplate: SceneTemplateId;
  toTemplate: SceneTemplateId;
  reason: string;
};

const ALTERNATES: Partial<Record<SceneTemplateId, SceneTemplateId[]>> = {
  gallery: ["story", "chart", "timeline", "quote"],
  story: ["timeline", "quote", "chart"],
  chart: ["story", "timeline", "quote"],
  hero: ["story"],
  quote: ["story", "timeline"],
};

function templateIdOf(scene: ExperienceScene): SceneTemplateId {
  return scene.recommendedTemplate?.templateId ?? "story";
}

function tryAlternate(
  scene: ExperienceScene,
  alternate: SceneTemplateId,
  handoff: DirectorEditorialPackage,
): SceneTemplateId | null {
  if (assessLayoutReadiness(scene, alternate, handoff) !== "ready") {
    const resolved = resolveFinalTemplate(scene, alternate, handoff);
    if (resolved.templateId !== alternate) return null;
  }
  return alternate;
}

export function applyVarietyEngine(
  handoff: DirectorEditorialPackage,
  plan: ExperiencePlan,
): { plan: ExperiencePlan; adjustments: VarietyAdjustment[] } {
  const scenes = plan.scenes.map((s) => ({ ...s }));
  const adjustments: VarietyAdjustment[] = [];

  let i = 0;
  while (i < scenes.length) {
    const id = templateIdOf(scenes[i]!);
    let run = 1;
    while (i + run < scenes.length && templateIdOf(scenes[i + run]!) === id) {
      run += 1;
    }

    if (run >= 3) {
      const alternates = ALTERNATES[id] ?? ["story"];
      const midStart = i + 1;
      const midEnd = i + run - 2;

      for (let j = midStart; j <= midEnd; j += 1) {
        const scene = scenes[j]!;
        for (const alt of alternates) {
          if (alt === id) continue;
          const viable = tryAlternate(scene, alt, handoff);
          if (viable) {
            scenes[j] = {
              ...scene,
              varietyAdjusted: true,
              recommendedTemplate: {
                templateId: viable,
                displayName: getSceneTemplate(viable).displayName,
                confidence: (scene.recommendedTemplate?.confidence ?? 80) - 5,
                reason: `Variety: ${getSceneTemplate(id).displayName} run broken with ${getSceneTemplate(viable).displayName}`,
              },
              layoutReadiness: assessLayoutReadiness(scene, viable, handoff),
            };
            adjustments.push({
              sceneNumber: scene.sceneNumber,
              fromTemplate: id,
              toTemplate: viable,
              reason: `${run} consecutive ${getSceneTemplate(id).displayName} scenes — alternate layout`,
            });
            break;
          }
        }
      }
    }

    i += run;
  }

  return {
    plan: { ...plan, version: "0.3", scenes },
    adjustments,
  };
}

export function computeDiversityScores(plan: ExperiencePlan): {
  templateDiversity: number;
  visualDiversity: number;
  pacingDiversity: number;
} {
  const scenes = plan.scenes;
  if (scenes.length === 0) {
    return { templateDiversity: 0, visualDiversity: 0, pacingDiversity: 0 };
  }

  const uniqueTemplates = new Set(scenes.map((s) => templateIdOf(s))).size;
  const templateDiversity = Math.round((uniqueTemplates / scenes.length) * 100);

  const uniqueImageSets = new Set(
    scenes.map((s) => s.linkedImageAssetIds.join(",")),
  ).size;
  const visualDiversity = Math.round((uniqueImageSets / scenes.length) * 100);

  const durations = scenes.map((s) => s.estimatedDurationSec);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance =
    durations.reduce((sum, d) => sum + (d - avg) ** 2, 0) / durations.length;
  const pacingDiversity = Math.min(100, Math.round(Math.sqrt(variance) * 10));

  return { templateDiversity, visualDiversity, pacingDiversity };
}
