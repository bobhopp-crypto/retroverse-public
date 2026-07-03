/**
 * Map storyboard pages → ExperiencePlan scenes (Publisher contract unchanged).
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import type { ExperiencePlan, ExperienceScene } from "../types";
import type { DirectorStoryPage, DirectorStoryboardBeat } from "./types";

function sceneTypeForTemplate(templateId: string): ExperienceScene["sceneType"] {
  if (templateId === "hero") return "hero";
  if (templateId === "chart") return "chart";
  if (templateId === "timeline") return "timeline";
  if (templateId === "performance") return "performance";
  if (templateId === "gallery") return "image";
  if (templateId === "quote") return "story";
  return "story";
}

function mapTemplateId(templateId: string): import("../scene-template-library").SceneTemplateId {
  if (templateId === "gallery") return "gallery";
  if (templateId === "chart") return "chart";
  if (templateId === "timeline") return "timeline";
  if (templateId === "performance") return "performance";
  if (templateId === "hero") return "hero";
  if (templateId === "quote") return "quote";
  return "story";
}

export function pagesToExperiencePlan(
  handoff: DirectorEditorialPackage,
  pages: DirectorStoryPage[],
  storyboard: DirectorStoryboardBeat[],
): ExperiencePlan {
  const orderedPageIds = storyboard.flatMap((b) => b.pageIds);
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const orderedPages = orderedPageIds
    .map((id) => pageById.get(id))
    .filter((p): p is DirectorStoryPage => Boolean(p));

  const scenes: ExperienceScene[] = orderedPages.map((page, index) => {
    const sceneNumber = index + 1;
    page.sceneNumber = sceneNumber;

    return {
      sceneNumber,
      sceneType: sceneTypeForTemplate(page.templateId),
      title: page.title,
      headline: page.headline,
      supportingCopy: page.supportingCopy,
      narrativePurpose: `story:${page.storyId}:exhibit:${page.exhibitId}:page:${page.id}`,
      linkedFactIds: page.factIds,
      linkedImageAssetIds: page.mediaIds,
      linkedPerformanceId:
        page.storyId === "performance_history" ? handoff.performance.id || null : null,
      estimatedDurationSec:
        page.templateId === "chart" || page.templateId === "timeline" ? 9 : 8,
      priority: page.storyId === "hero" || page.storyId === "chart_journey" ? 1 : 2,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: mapTemplateId(page.templateId),
        displayName: page.title,
        confidence: 92,
        reason: `Story page — ${page.storyId}`,
      },
      layoutReadiness: page.supportingCopy.trim() || page.mediaIds.length ? "ready" : "needs_supporting_copy",
      layoutReadinessLabel: "Ready",
    };
  });

  const estimatedRuntimeSec = scenes.reduce((sum, s) => sum + s.estimatedDurationSec, 0);

  return {
    version: "0.3",
    opening: handoff.story.hook || handoff.story.headline,
    closing: handoff.story.summary || "",
    scenes,
    estimatedRuntimeSec,
    targetRuntimeSec: { min: estimatedRuntimeSec, max: estimatedRuntimeSec + 30 },
    primaryPerformance: {
      performanceId: handoff.performance.id,
      title: handoff.performance.title,
      reason: handoff.performance.notes || "Storytelling pipeline",
    },
    visualRhythm: "moderate",
    presentationStyle: "documentary",
    templateLibraryVersion: "storytelling-3.36",
  };
}
