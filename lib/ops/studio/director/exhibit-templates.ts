/**
 * Director 2.0 — lock exhibit scenes to museum presentation templates.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import { exhibitIdFromScene, isExtendedExhibitScene } from "./exhibit-plan";
import type { ExperiencePlan, ExperienceScene } from "./types";

const EXHIBIT_TEMPLATE: Record<
  string,
  NonNullable<ExperienceScene["recommendedTemplate"]>["templateId"]
> = {
  cover: "hero",
  chart_journey: "chart",
  iconic_moment: "gallery",
  song_dna: "gallery",
  performance: "performance",
};

function templateForExhibit(exhibitId: string): NonNullable<ExperienceScene["recommendedTemplate"]> {
  const templateId = EXHIBIT_TEMPLATE[exhibitId] ?? "gallery";
  return {
    templateId,
    displayName: exhibitId.replace(/_/g, " "),
    confidence: 96,
    reason: "Fixed museum exhibit template",
  };
}

export function applyExhibitTemplates(
  _handoff: DirectorEditorialPackage,
  plan: ExperiencePlan,
): ExperiencePlan {
  const scenes = plan.scenes.map((scene) => {
    if (isExtendedExhibitScene(scene)) {
      return {
        ...scene,
        recommendedTemplate: scene.recommendedTemplate ?? {
          templateId: "gallery",
          displayName: "Extended Exhibit",
          confidence: 85,
          reason: "Extended museum moment",
        },
        layoutReadiness: scene.linkedImageAssetIds.length ? ("ready" as const) : scene.layoutReadiness,
        layoutReadinessLabel: scene.linkedImageAssetIds.length ? "Ready" : "Needs image",
      };
    }

    const exhibitId = exhibitIdFromScene(scene);
    if (!exhibitId) return scene;

    const recommendedTemplate = templateForExhibit(exhibitId);
    const layoutReadiness =
      exhibitId === "song_dna" || scene.linkedImageAssetIds.length > 0 || exhibitId === "cover"
        ? ("ready" as const)
        : ("needs_image" as const);

    return {
      ...scene,
      recommendedTemplate,
      preferredTemplate: recommendedTemplate,
      layoutReadiness,
      layoutReadinessLabel: layoutReadiness === "ready" ? "Ready" : "Needs frame",
      templateDowngraded: false,
      downgradeReason: null,
    };
  });

  return {
    ...plan,
    version: "0.3",
    scenes,
    templateLibraryVersion: "museum-2.0",
  };
}
