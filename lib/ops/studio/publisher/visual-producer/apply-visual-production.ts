/**
 * Sprint 3.37 — Apply Visual Production Plan to presentable scenes.
 */

import type { PresentableScene, PresentationLayout } from "@/lib/retroverse/renderer/scene-presentation";

import type { VisualProductionPlan } from "./types";

const VALID_LAYOUTS = new Set<string>([
  "fullscreen",
  "image_quote",
  "minimal_fact",
  "chart",
  "performance",
  "timeline",
  "museum_identity",
  "museum_performance",
  "museum_dna",
  "museum_chart",
  "museum_iconic",
  "museum_closing",
]);

export function applyVisualProductionToScenes(
  scenes: PresentableScene[],
  plan: VisualProductionPlan | null,
): PresentableScene[] {
  if (!plan?.scenes.length) return scenes;

  const bySceneNumber = new Map(plan.scenes.map((s) => [s.sceneNumber, s]));

  return scenes.map((scene) => {
    const produced = bySceneNumber.get(scene.sceneNumber);
    if (!produced) return scene;

    const layout = VALID_LAYOUTS.has(produced.presentationLayout)
      ? (produced.presentationLayout as PresentationLayout)
      : scene.presentationLayout;

    return {
      ...scene,
      presentationLayout: layout,
      transitionIn: produced.transition.transitionIn as PresentableScene["transitionIn"],
      transitionOut: produced.transition.transitionOut as PresentableScene["transitionOut"],
      headline: produced.headline || scene.headline,
      composeReason: `visual-producer:${produced.layout}`,
      visualIntensity:
        produced.rhythm.visualWeight === "heavy"
          ? "high"
          : produced.rhythm.visualWeight === "light"
            ? "low"
            : "medium",
    };
  });
}
