/**
 * Sprint 3.35 — Experience variety rules: cap repeated visual types, enforce contrast.
 */

import type { DirectorStoryPage, DirectorVisualConcept } from "./types";

const CAPPED_TYPES: Record<string, { max: number; fallbackTemplate: string; family: string }> = {
  timeline: { max: 2, fallbackTemplate: "quote", family: "timeline" },
  gallery: { max: 2, fallbackTemplate: "performance", family: "gallery" },
  quote_focus: { max: 2, fallbackTemplate: "chart", family: "quote" },
  documentary: { max: 2, fallbackTemplate: "gallery", family: "quote" },
  infographic: { max: 2, fallbackTemplate: "timeline", family: "chart" },
};

const TYPE_FAMILY: Record<string, string> = {
  cinematic_opening: "hero",
  magazine_spread: "gallery",
  documentary: "quote",
  timeline: "timeline",
  gallery: "gallery",
  infographic: "chart",
  collector_card: "gallery",
  record_sleeve: "gallery",
  map: "quote",
  performance_reel: "performance",
  comparison: "gallery",
  before_after: "gallery",
  quote_focus: "quote",
  motion_graphic: "chart",
  data_visualization: "gallery",
};

const CONTRAST_TEMPLATE: Record<string, string> = {
  hero: "quote",
  quote: "gallery",
  gallery: "chart",
  chart: "performance",
  timeline: "gallery",
  performance: "quote",
  story: "quote",
};

export type ExperienceVarietyEnforcement = {
  pages: DirectorStoryPage[];
  visualConcepts: DirectorVisualConcept[];
  violations: Array<{ rule: string; message: string; fixHint: string }>;
};

export function enforceExperienceVariety(
  pages: DirectorStoryPage[],
  visualConcepts: DirectorVisualConcept[],
  orderedPageIds: string[],
): ExperienceVarietyEnforcement {
  const violations: Array<{ rule: string; message: string; fixHint: string }> = [];
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const conceptByExhibit = new Map(visualConcepts.map((c) => [c.exhibitId, c]));
  const typeCounts = new Map<string, number>();

  const ordered = orderedPageIds
    .map((id) => pageById.get(id))
    .filter((p): p is DirectorStoryPage => Boolean(p));

  for (let i = 0; i < ordered.length; i++) {
    const page = ordered[i]!;
    const concept = conceptByExhibit.get(page.exhibitId);
    if (!concept) continue;

    let expType = concept.experienceType;
    const cap = CAPPED_TYPES[expType];
    const count = typeCounts.get(expType) ?? 0;

    if (cap && count >= cap.max) {
      page.templateId = cap.fallbackTemplate;
      concept.templateId = cap.fallbackTemplate;
      violations.push({
        rule: `max_${cap.max}_${cap.family}`,
        message: `Capped ${expType.replace(/_/g, " ")} at ${cap.max} — switched "${page.headline}" to ${cap.fallbackTemplate}`,
        fixHint: "Merge or reframe excess pages of the same visual type",
      });
      expType = cap.fallbackTemplate === "quote" ? "quote_focus" : "gallery";
    }

    typeCounts.set(concept.experienceType, (typeCounts.get(concept.experienceType) ?? 0) + 1);

    if (page.templateId === "story") {
      page.templateId = "quote";
      concept.templateId = "quote";
      violations.push({
        rule: "no_plain_text",
        message: `Upgraded plain text page "${page.headline}" to quote treatment`,
        fixHint: "Every page needs a visual concept — never default to plain text",
      });
    }

    if (i >= 1) {
      const prev = ordered[i - 1]!;
      const prevConcept = conceptByExhibit.get(prev.exhibitId);
      const prevFamily = TYPE_FAMILY[prevConcept?.experienceType ?? ""] ?? prev.templateId;
      const curFamily = TYPE_FAMILY[expType] ?? page.templateId;
      if (prevFamily === curFamily && curFamily === "quote") {
        const alt = CONTRAST_TEMPLATE[curFamily] ?? "gallery";
        page.templateId = alt;
        concept.templateId = alt;
        violations.push({
          rule: "consecutive_contrast",
          message: `Broke consecutive ${curFamily} run at "${page.headline}" → ${alt}`,
          fixHint: "Alternate illustration, timeline, photo, infographic, video, quote, collage",
        });
      }
    }

    page.visualConceptId = concept.id;
  }

  return { pages, visualConcepts, violations };
}
