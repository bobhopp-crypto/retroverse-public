/**
 * Director 0.2 — Scene Template Library.
 * Pure planning data — no HTML/CSS/rendering.
 */

import type { RecommendedPace } from "@/lib/ops/studio/editor/types";

import type { PresentationStyle, VisualRhythm } from "./types";

export type SceneTemplateId =
  | "hero"
  | "story"
  | "timeline"
  | "quote"
  | "fact_stack"
  | "performance"
  | "gallery"
  | "chart"
  | "comparison"
  | "closing";

/** Editorial theme tags templates support (not only Editor ThemeId). */
export type TemplateThemeTag =
  | "breakthrough"
  | "celebration"
  | "legacy"
  | "history"
  | "innovation"
  | "career"
  | "concert"
  | "television"
  | "awards"
  | "culture"
  | "chart_success"
  | "performance"
  | "nostalgia"
  | "drama";

export type SceneTemplateDefinition = {
  id: SceneTemplateId;
  displayName: string;
  purpose: string;
  preferredContent: string[];
  requiredAssets: string[];
  optionalAssets: string[];
  supportedThemes: TemplateThemeTag[];
  supportedPacing: RecommendedPace[];
  minDurationSec: number;
  maxDurationSec: number;
};

export const SCENE_TEMPLATE_LIBRARY: Record<SceneTemplateId, SceneTemplateDefinition> = {
  hero: {
    id: "hero",
    displayName: "Hero",
    purpose: "Strong opening statement — establish subject and tone immediately",
    preferredContent: ["headline", "hook", "hero image", "opening line"],
    requiredAssets: ["hero_image"],
    optionalAssets: ["opening_fact", "performance_reference"],
    supportedThemes: ["breakthrough", "celebration", "legacy", "culture"],
    supportedPacing: ["slow", "moderate", "fast", "mixed"],
    minDurationSec: 8,
    maxDurationSec: 18,
  },
  story: {
    id: "story",
    displayName: "Story",
    purpose: "Headline + supporting text + single focal image",
    preferredContent: ["headline", "supporting copy", "one image", "1-2 facts"],
    requiredAssets: ["headline", "supporting_copy", "image"],
    optionalAssets: ["fact"],
    supportedThemes: ["culture", "history", "career", "legacy"],
    supportedPacing: ["slow", "moderate", "mixed"],
    minDurationSec: 10,
    maxDurationSec: 22,
  },
  timeline: {
    id: "timeline",
    displayName: "Timeline",
    purpose: "Chronological events — release, recording, performance arcs",
    preferredContent: ["dated events", "year labels", "sequence of facts"],
    requiredAssets: ["timeline_events"],
    optionalAssets: ["image", "fact"],
    supportedThemes: ["history", "innovation", "career", "legacy"],
    supportedPacing: ["moderate", "slow", "mixed"],
    minDurationSec: 12,
    maxDurationSec: 24,
  },
  quote: {
    id: "quote",
    displayName: "Quote",
    purpose: "Highlight an important quote or pull line",
    preferredContent: ["quote text", "attribution", "optional image"],
    requiredAssets: ["quote_text"],
    optionalAssets: ["image", "fact"],
    supportedThemes: ["culture", "drama", "celebration", "legacy"],
    supportedPacing: ["slow", "moderate"],
    minDurationSec: 8,
    maxDurationSec: 16,
  },
  fact_stack: {
    id: "fact_stack",
    displayName: "Fact Stack",
    purpose: "Multiple short facts presented as a stack",
    preferredContent: ["2+ facts", "bullet rhythm", "minimal imagery"],
    requiredAssets: ["facts_multiple"],
    optionalAssets: ["image"],
    supportedThemes: ["culture", "chart_success", "history"],
    supportedPacing: ["fast", "moderate", "mixed"],
    minDurationSec: 10,
    maxDurationSec: 20,
  },
  performance: {
    id: "performance",
    displayName: "Performance",
    purpose: "Focus on one owned performance — venue, year, visuals",
    preferredContent: ["performance title", "venue", "performance image", "year"],
    requiredAssets: ["performance_reference", "performance_image"],
    optionalAssets: ["fact", "venue_label"],
    supportedThemes: ["concert", "television", "awards", "performance"],
    supportedPacing: ["moderate", "fast", "mixed"],
    minDurationSec: 14,
    maxDurationSec: 26,
  },
  gallery: {
    id: "gallery",
    displayName: "Gallery",
    purpose: "Multiple related images — visual abundance",
    preferredContent: ["2+ images", "short caption", "visual rhythm"],
    requiredAssets: ["images_multiple"],
    optionalAssets: ["fact", "headline"],
    supportedThemes: ["culture", "concert", "television", "celebration"],
    supportedPacing: ["moderate", "fast", "mixed"],
    minDurationSec: 10,
    maxDurationSec: 22,
  },
  chart: {
    id: "chart",
    displayName: "Chart",
    purpose: "Chart history — peak position, weeks on chart",
    preferredContent: ["chart peak", "weeks on chart", "chart fact"],
    requiredAssets: ["chart_data"],
    optionalAssets: ["image", "year_label"],
    supportedThemes: ["breakthrough", "chart_success", "celebration"],
    supportedPacing: ["moderate", "fast"],
    minDurationSec: 10,
    maxDurationSec: 18,
  },
  comparison: {
    id: "comparison",
    displayName: "Comparison",
    purpose: "Song vs Recording vs Performance — separated timelines",
    preferredContent: ["song year", "recording edition", "performance moment"],
    requiredAssets: ["comparison_copy"],
    optionalAssets: ["image", "facts"],
    supportedThemes: ["history", "legacy", "culture", "innovation"],
    supportedPacing: ["moderate", "slow"],
    minDurationSec: 12,
    maxDurationSec: 22,
  },
  closing: {
    id: "closing",
    displayName: "Closing",
    purpose: "Final takeaway — legacy, chart echo, or return to opening",
    preferredContent: ["closing line", "summary", "final image"],
    requiredAssets: ["closing_copy"],
    optionalAssets: ["image", "fact"],
    supportedThemes: ["legacy", "celebration", "culture", "breakthrough"],
    supportedPacing: ["slow", "moderate"],
    minDurationSec: 10,
    maxDurationSec: 18,
  },
};

export function getSceneTemplate(id: SceneTemplateId): SceneTemplateDefinition {
  return SCENE_TEMPLATE_LIBRARY[id];
}

export function allSceneTemplateIds(): SceneTemplateId[] {
  return Object.keys(SCENE_TEMPLATE_LIBRARY) as SceneTemplateId[];
}

export function templateMatchesPresentationStyle(
  template: SceneTemplateDefinition,
  style: PresentationStyle,
): boolean {
  if (style === "concert") return template.supportedThemes.includes("concert");
  if (style === "countdown") return template.supportedThemes.includes("chart_success");
  if (style === "television_retrospective") {
    return template.supportedThemes.includes("television");
  }
  return true;
}

export function templateMatchesRhythm(
  template: SceneTemplateDefinition,
  rhythm: VisualRhythm,
): boolean {
  const pace: RecommendedPace = rhythm === "mixed" ? "mixed" : rhythm;
  return template.supportedPacing.includes(pace);
}
