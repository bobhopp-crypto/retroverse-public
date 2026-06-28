/**
 * Sprint 3.35 — Experience variety audit: scroll-stop test + media balance.
 */

import type {
  DirectorExperienceConcept,
  DirectorExperienceVarietyAudit,
  DirectorStoryPage,
  DirectorVisualConcept,
} from "./types";
import { experienceTypeLabel } from "./design-experiences";

const TEXT_TEMPLATES = new Set(["story"]);

function mediaBucket(templateId: string, mediaCount: number): keyof DirectorExperienceVarietyAudit["mediaBalance"] {
  if (templateId === "performance") return "video";
  if (templateId === "chart" || templateId === "timeline") return "chart";
  if (templateId === "gallery" && mediaCount > 0) return "photo";
  if (templateId === "hero" || templateId === "gallery") return mediaCount > 0 ? "photo" : "illustration";
  if (templateId === "quote" || templateId === "story") return "text";
  return "illustration";
}

export function buildExperienceVarietyAudit(
  pages: DirectorStoryPage[],
  visualConcepts: DirectorVisualConcept[],
  experienceConcepts: DirectorExperienceConcept[],
  varietyViolations: Array<{ rule: string; message: string; fixHint: string }>,
  orderedPageIds: string[],
): DirectorExperienceVarietyAudit {
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const conceptByExhibit = new Map(visualConcepts.map((c) => [c.exhibitId, c]));
  const expByStory = new Map(experienceConcepts.map((c) => [c.storyId, c]));

  const ordered = orderedPageIds
    .map((id) => pageById.get(id))
    .filter((p): p is DirectorStoryPage => Boolean(p));

  const visualTypesUsed: Record<string, number> = {};
  const motionTypesUsed: Record<string, number> = {};
  const mediaBalance = { photo: 0, video: 0, chart: 0, text: 0, illustration: 0 };
  const textHeavyWarnings: string[] = [];
  const repeatedLayouts: string[] = [];
  const scrollStopMoments: DirectorExperienceVarietyAudit["scrollStopMoments"] = [];

  let prevLabel: string | null = null;
  let distinctTypes = new Set<string>();

  for (const page of ordered) {
    const vc = conceptByExhibit.get(page.exhibitId);
    const exp = expByStory.get(page.storyId);
    const typeKey = vc ? experienceTypeLabel(vc.experienceType) : page.templateId;
    visualTypesUsed[typeKey] = (visualTypesUsed[typeKey] ?? 0) + 1;
    distinctTypes.add(typeKey);

    const motion = exp?.visualVocabulary.motionStyle ?? vc?.motionHint ?? "fade";
    motionTypesUsed[motion] = (motionTypesUsed[motion] ?? 0) + 1;

    const bucket = mediaBucket(page.templateId, page.mediaIds.length);
    mediaBalance[bucket] += 1;

    if (TEXT_TEMPLATES.has(page.templateId) && page.mediaIds.length === 0) {
      textHeavyWarnings.push(`"${page.headline}" is text-only — needs visual treatment`);
    }

    const label = vc?.wireframeLabel ?? page.templateId;
    if (label === prevLabel) {
      repeatedLayouts.push(`Repeated "${label}" layout at "${page.headline}"`);
    }
    prevLabel = label;

    const priority = exp?.visualPriority ?? 3;
    let verdict: "strong" | "moderate" | "weak" = "moderate";
    let reason = "Standard visual beat";
    if (priority >= 5 && page.mediaIds.length > 0) {
      verdict = "strong";
      reason = "High-priority concept with owned media — strong scroll-stop";
    } else if (priority >= 4 && page.templateId !== "story") {
      verdict = "strong";
      reason = `${exp?.conceptTitle ?? typeKey} — distinctive treatment`;
    } else if (TEXT_TEMPLATES.has(page.templateId)) {
      verdict = "weak";
      reason = "Plain text — unlikely to stop scrolling";
    } else if (page.mediaIds.length === 0 && page.templateId === "quote") {
      verdict = "moderate";
      reason = "Quote-only — needs supporting visual";
    }

    scrollStopMoments.push({
      storyId: page.storyId,
      pageId: page.id,
      verdict,
      reason,
    });
  }

  const builtStoryIds = new Set(experienceConcepts.map((c) => c.storyId));
  const pageStoryIds = new Set(ordered.map((p) => p.storyId));
  const missingVisualOpportunities: string[] = [];

  for (const concept of experienceConcepts) {
    if (!pageStoryIds.has(concept.storyId)) {
      missingVisualOpportunities.push(
        `${concept.storyTitle}: concept "${concept.conceptTitle}" has no pages yet`,
      );
    }
    if (concept.visualPriority >= 4 && concept.primaryMedia.toLowerCase().includes("illustration")) {
      const hasPage = ordered.some((p) => p.storyId === concept.storyId);
      if (hasPage && !ordered.some((p) => p.storyId === concept.storyId && p.mediaIds.length > 0)) {
        missingVisualOpportunities.push(
          `${concept.storyTitle}: illustration-led concept — add supporting media or generated art`,
        );
      }
    }
  }

  for (const id of builtStoryIds) {
    if (!pageStoryIds.has(id) && id !== "artist_journey" && id !== "related_songs") {
      missingVisualOpportunities.push(`Story "${id}" has experience concept but zero pages`);
    }
  }

  const textRatio = mediaBalance.text / Math.max(1, ordered.length);
  const distinctRatio = distinctTypes.size / Math.max(1, ordered.length);
  const violationPenalty = varietyViolations.length * 4;
  const varietyScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(distinctRatio * 55 + (1 - textRatio) * 35 + 10 - violationPenalty),
    ),
  );

  return {
    varietyScore,
    visualTypesUsed,
    motionTypesUsed,
    mediaBalance,
    textHeavyWarnings,
    repeatedLayouts: [...new Set(repeatedLayouts)],
    missingVisualOpportunities: [...new Set(missingVisualOpportunities)],
    scrollStopMoments,
    varietyViolations,
  };
}
