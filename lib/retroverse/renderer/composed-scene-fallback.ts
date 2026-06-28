import type { RenderSpecScene } from "@/lib/retroverse/renderer/types";
import type { ComposedScene, MomentType } from "@/lib/retroverse/scene-composer/types";
import { MOMENT_TYPE_LABELS } from "@/lib/retroverse/scene-composer/types";

function inferMomentType(scene: RenderSpecScene): MomentType {
  if (scene.templateId === "hero") return "hero_moment";
  if (scene.templateId === "closing") return "final_reflection";
  if (scene.templateId === "chart") return "chart_milestone";
  if (scene.templateId === "performance") return "performance_spotlight";
  if (scene.templateId === "quote") return "big_quote";
  if (scene.templateId === "fact_stack") return "did_you_know";
  if (scene.templateId === "timeline") return "timeline_beat";
  if (scene.templateId === "gallery") return "visual_break";
  if (/legacy/i.test(scene.headline)) return "legacy_moment";
  return "behind_the_song";
}

export function wrapDirectorScenesAsComposed(scenes: RenderSpecScene[]): ComposedScene[] {
  return scenes.map((scene) => {
    const momentType = inferMomentType(scene);
    return {
      ...scene,
      momentType,
      momentLabel: MOMENT_TYPE_LABELS[momentType],
      sourceSceneNumbers: [scene.sceneNumber],
      visualIntensity: scene.importance === "high" ? "high" : "medium",
      composeReason: "Director scene (composition fallback).",
    };
  });
}

export function isComposedScene(scene: RenderSpecScene): scene is ComposedScene {
  return "momentLabel" in scene && typeof (scene as ComposedScene).momentLabel === "string";
}
