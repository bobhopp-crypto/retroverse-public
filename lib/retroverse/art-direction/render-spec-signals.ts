import type { ParsedExperience } from "@/lib/retroverse/renderer/types";

export type RenderSpecSignals = {
  sceneCount: number;
  totalDurationSec: number;
  imageCount: number;
  factCount: number;
  timelineEventCount: number;
  hasPerformanceImagery: boolean;
  hasTimelineScenes: boolean;
  dominantTemplate: string;
};

export function extractRenderSpecSignals(experience: ParsedExperience): RenderSpecSignals {
  const { scenes, totalDurationSec } = experience;
  let imageCount = 0;
  let factCount = 0;
  let timelineEventCount = 0;
  let hasPerformanceImagery = false;
  let hasTimelineScenes = false;
  const templateCounts = new Map<string, number>();

  for (const scene of scenes) {
    imageCount += scene.assets.imageUrls.length;
    factCount += scene.assets.factTexts.length;
    timelineEventCount += scene.assets.timelineEvents.length;
    if (scene.assets.imageUrls.length > 1) hasPerformanceImagery = true;
    if (scene.templateId.includes("timeline") || scene.assets.timelineEvents.length > 0) {
      hasTimelineScenes = true;
    }
    templateCounts.set(scene.templateId, (templateCounts.get(scene.templateId) ?? 0) + 1);
  }

  let dominantTemplate = "hero";
  let max = 0;
  for (const [id, count] of templateCounts) {
    if (count > max) {
      max = count;
      dominantTemplate = id;
    }
  }

  return {
    sceneCount: scenes.length,
    totalDurationSec,
    imageCount,
    factCount,
    timelineEventCount,
    hasPerformanceImagery,
    hasTimelineScenes,
    dominantTemplate,
  };
}
