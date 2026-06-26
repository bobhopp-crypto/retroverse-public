/**
 * Director 0.2 — deterministic template selection + layout readiness.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { ThemeId } from "@/lib/ops/studio/editor/types";

import {
  getSceneTemplate,
  type SceneTemplateId,
  templateMatchesPresentationStyle,
  templateMatchesRhythm,
} from "./scene-template-library";

import type {
  ExperienceScene,
  LayoutReadinessStatus,
  SceneTemplateRecommendation,
  SceneType,
} from "./types";

export type TemplateSelectionContext = {
  primaryTheme: ThemeId;
  secondaryTheme: ThemeId | null;
  hasYearResolution: boolean;
  approvedImageCount: number;
  approvedFactCount: number;
};

function themeTagFromEditor(theme: ThemeId | null): string {
  if (!theme) return "culture";
  if (theme === "chart_success") return "chart_success";
  if (theme === "performance") return "performance";
  if (theme === "television") return "television";
  if (theme === "breakthrough") return "breakthrough";
  if (theme === "reinvention") return "career";
  return "culture";
}

function scoreTemplateFit(
  templateId: SceneTemplateId,
  scene: ExperienceScene,
  ctx: TemplateSelectionContext,
  presentationStyle: string,
  rhythm: string,
): number {
  const def = getSceneTemplate(templateId);
  let score = 50;

  const themeTag = themeTagFromEditor(ctx.primaryTheme);
  if (def.supportedThemes.includes(themeTag as never)) score += 15;
  if (ctx.secondaryTheme && def.supportedThemes.includes(themeTagFromEditor(ctx.secondaryTheme) as never)) {
    score += 5;
  }

  if (templateMatchesPresentationStyle(def, presentationStyle as never)) score += 8;
  if (templateMatchesRhythm(def, rhythm as never)) score += 5;

  if (templateId === "gallery" && scene.linkedImageAssetIds.length >= 2) score += 20;
  if (templateId === "fact_stack" && scene.linkedFactIds.length >= 2) score += 20;
  if (templateId === "performance" && scene.linkedPerformanceId) score += 15;
  if (templateId === "chart" && /hot 100|billboard|peaked|chart/i.test(scene.supportingCopy)) score += 20;
  if (templateId === "timeline" && /\b(19|20)\d{2}\b/.test(scene.supportingCopy)) score += 12;
  if (templateId === "comparison" && /separate recording|song|recording edition|original release/i.test(scene.supportingCopy)) {
    score += 18;
  }
  if (templateId === "quote" && scene.supportingCopy.length >= 60 && scene.supportingCopy.length <= 200) {
    score += 10;
  }

  const dur = scene.estimatedDurationSec;
  if (dur >= def.minDurationSec && dur <= def.maxDurationSec) score += 8;

  return Math.min(99, score);
}

function baseTemplateForSceneType(sceneType: SceneType, title: string): SceneTemplateId {
  if (sceneType === "hero" || title === "Opening") return "hero";
  if (sceneType === "closing" || title === "Closing") return "closing";
  if (sceneType === "performance") return "performance";
  if (sceneType === "chart") return "chart";
  if (sceneType === "quote") return "quote";
  if (sceneType === "timeline") return "timeline";
  if (sceneType === "image") return "gallery";
  return "story";
}

function reasonForTemplate(
  templateId: SceneTemplateId,
  scene: ExperienceScene,
  candidates: Array<{ id: SceneTemplateId; score: number }>,
): string {
  const top = candidates[0]!;
  const parts: string[] = [];

  switch (templateId) {
    case "hero":
      parts.push("Opening beat requires a strong hero layout");
      break;
    case "closing":
      parts.push("Final scene uses closing takeaway layout");
      break;
    case "timeline":
      parts.push("The narrative beat is chronological or year-anchored");
      break;
    case "performance":
      parts.push("Beat focuses on owned performance footage");
      break;
    case "chart":
      parts.push("Chart milestone or commercial success data present");
      break;
    case "quote":
      parts.push("Key moment reads as a pull quote or highlight line");
      break;
    case "fact_stack":
      parts.push("Multiple supporting facts suit a stacked layout");
      break;
    case "gallery":
      parts.push("Multiple related images available for this beat");
      break;
    case "comparison":
      parts.push("Copy distinguishes song, recording, or performance timelines");
      break;
    default:
      parts.push("Standard story beat — headline, copy, and image");
  }

  if (top.id !== templateId && candidates.length > 1) {
    parts.push(`Selected over ${top.id} (${top.score}% fit)`);
  }

  return parts.join(". ") + ".";
}

/** Deterministic template recommendation for one scene. */
export function selectSceneTemplate(
  scene: ExperienceScene,
  ctx: TemplateSelectionContext,
  presentationStyle: string,
  rhythm: string,
): SceneTemplateRecommendation {
  const hay = `${scene.title} ${scene.supportingCopy} ${scene.narrativePurpose}`.toLowerCase();

  const candidates: SceneTemplateId[] = [baseTemplateForSceneType(scene.sceneType, scene.title)];

  if (scene.linkedFactIds.length >= 3) candidates.push("fact_stack");
  if (scene.linkedImageAssetIds.length >= 2) candidates.push("gallery");
  if (/timeline|chronolog|release moment|year|19\d{2}|20\d{2}/i.test(hay)) candidates.push("timeline");
  if (/separate recording|compilation|original release|recording edition|song.*recording/i.test(hay)) {
    candidates.push("comparison");
  }
  if (scene.sceneType === "story" && scene.supportingCopy.length >= 80 && scene.linkedFactIds.length <= 1) {
    candidates.push("quote");
  }

  const uniqueCandidates = [...new Set(candidates)];
  const scored = uniqueCandidates
    .map((id) => ({
      id,
      score: scoreTemplateFit(id, scene, ctx, presentationStyle, rhythm),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0]!;
  const confidence = Math.max(72, Math.min(99, best.score));

  return {
    templateId: best.id,
    displayName: getSceneTemplate(best.id).displayName,
    confidence,
    reason: reasonForTemplate(best.id, scene, scored),
  };
}

export function assessLayoutReadiness(
  scene: ExperienceScene,
  templateId: SceneTemplateId,
  handoff: DirectorEditorialPackage,
): LayoutReadinessStatus {
  const copy = scene.supportingCopy.trim();
  const images = scene.linkedImageAssetIds.length;
  const facts = scene.linkedFactIds.length;
  const hasPerf = Boolean(scene.linkedPerformanceId);
  const hasChartInCopy = /hot 100|billboard|peaked|#\d+/i.test(copy);
  const hasYears = /\b(19|20)\d{2}\b/.test(copy);
  const hasComparisonCopy = /separate recording|original release|recording edition|compilation/i.test(copy);

  switch (templateId) {
    case "hero":
      if (images === 0 && handoff.approvedImages.length === 0) return "needs_hero_image";
      if (copy.length < 20) return "needs_headline";
      return "ready";

    case "story":
      if (copy.length < 25) return "needs_supporting_copy";
      if (images === 0) return "needs_image";
      return "ready";

    case "timeline":
      if (!hasYears && facts === 0) return "needs_timeline_events";
      return "ready";

    case "quote":
      if (copy.length < 40) return "needs_quote";
      return "ready";

    case "fact_stack":
      if (facts < 2) return "needs_facts";
      return "ready";

    case "performance":
      if (!hasPerf) return "needs_performance";
      if (images === 0 && handoff.performance.screenshots.length === 0) return "needs_performance_image";
      return "ready";

    case "gallery":
      if (images < 2 && handoff.approvedImages.length < 2) return "needs_multiple_images";
      return "ready";

    case "chart":
      if (!hasChartInCopy && facts === 0) return "needs_chart_data";
      return "ready";

    case "comparison":
      if (!hasComparisonCopy && !ctxHasYearResolution(handoff)) return "needs_comparison_copy";
      return "ready";

    case "closing":
      if (copy.length < 20) return "needs_closing_copy";
      return "ready";

    default:
      return "ready";
  }
}

function ctxHasYearResolution(handoff: DirectorEditorialPackage): boolean {
  const bp = handoff.narrativeBlueprint;
  if (!bp) return false;
  const song = bp.storyBeats.some((b) => /original|release|song/i.test(b.title));
  const rec = bp.storyBeats.some((b) => /recording|compilation|album/i.test(b.title));
  return song && rec;
}

export function layoutReadinessLabel(status: LayoutReadinessStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "needs_hero_image":
      return "Needs Hero Image";
    case "needs_image":
      return "Needs Image";
    case "needs_multiple_images":
      return "Needs Multiple Images";
    case "needs_quote":
      return "Needs Quote";
    case "needs_facts":
      return "Needs Facts";
    case "needs_timeline_events":
      return "Needs Timeline Events";
    case "needs_performance":
      return "Needs Performance";
    case "needs_performance_image":
      return "Needs Performance Image";
    case "needs_chart_data":
      return "Needs Chart Data";
    case "needs_comparison_copy":
      return "Needs Comparison Copy";
    case "needs_headline":
      return "Needs Headline";
    case "needs_supporting_copy":
      return "Needs Supporting Copy";
    case "needs_closing_copy":
      return "Needs Closing Copy";
    default:
      return "Needs Assets";
  }
}

export function buildTemplateContext(handoff: DirectorEditorialPackage): TemplateSelectionContext {
  const bp = handoff.narrativeBlueprint;
  return {
    primaryTheme: bp.primaryTheme,
    secondaryTheme: bp.secondaryTheme,
    hasYearResolution: ctxHasYearResolution(handoff),
    approvedImageCount: handoff.approvedImages.length,
    approvedFactCount: handoff.approvedFacts.length,
  };
}
