/**
 * Director 0.2 — attach template recommendations to Experience Plan scenes.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import {
  assessLayoutReadiness,
  buildTemplateContext,
  layoutReadinessLabel,
  selectSceneTemplate,
} from "./template-selection";

import type { ExperiencePlan, ExperienceScene } from "./types";

export function applySceneTemplates(
  handoff: DirectorEditorialPackage,
  plan: ExperiencePlan,
): ExperiencePlan {
  const ctx = buildTemplateContext(handoff);
  const scenes: ExperienceScene[] = plan.scenes.map((scene) => {
    const recommendedTemplate = selectSceneTemplate(
      scene,
      ctx,
      plan.presentationStyle,
      plan.visualRhythm,
    );
    const layoutReadiness = assessLayoutReadiness(
      scene,
      recommendedTemplate.templateId,
      handoff,
    );

    return {
      ...scene,
      recommendedTemplate,
      layoutReadiness,
      layoutReadinessLabel: layoutReadinessLabel(layoutReadiness),
    };
  });

  return {
    ...plan,
    version: "0.2",
    scenes,
    templateLibraryVersion: "0.2",
  };
}
