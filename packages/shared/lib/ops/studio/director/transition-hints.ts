/**
 * Director 0.3 — transition hint labels (recommendations only).
 */

import type { SceneTemplateId } from "./scene-template-library";
import type { TransitionHint } from "./render-spec-types";
import type { ExperienceScene } from "./types";

export function transitionInHint(
  scene: ExperienceScene,
  prevTemplate: SceneTemplateId | null,
): TransitionHint {
  const id = scene.recommendedTemplate?.templateId ?? "story";

  if (scene.title === "Opening" || id === "hero") return "reveal";
  if (scene.title === "Closing") return "fade";
  if (id === "performance") return "cut";
  if (id === "chart") return "cut";
  if (prevTemplate === id) return "crossfade";
  if (prevTemplate === "hero") return "fade";
  return "crossfade";
}

export function transitionOutHint(
  scene: ExperienceScene,
  nextTemplate: SceneTemplateId | null,
): TransitionHint {
  const id = scene.recommendedTemplate?.templateId ?? "story";

  if (scene.title === "Closing" || id === "closing") return "hold";
  if (id === "hero") return "fade";
  if (id === "performance") return "zoom";
  if (nextTemplate === "closing") return "dissolve";
  if (nextTemplate && nextTemplate === id) return "crossfade";
  return "crossfade";
}

export const ALL_TRANSITION_HINTS: TransitionHint[] = [
  "cut",
  "fade",
  "crossfade",
  "dissolve",
  "hold",
  "zoom",
  "reveal",
];
