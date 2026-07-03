/**
 * Sprint 3.37 — Visual Producer orchestrator.
 */

import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { normalizeRvtr } from "@/lib/studio/status";

import type { DirectorStoryPage } from "@/lib/ops/studio/director/storytelling/types";

import { runProductionReview } from "./production-review";
import { selectLayout, rhythmFamily } from "./select-layout";
import { selectMedia } from "./select-media";
import { saveVisualProduction } from "./store";
import { designTransition } from "./transitions";
import type {
  ProducedScene,
  ProducedSceneComposition,
  VisualProductionPlan,
  VisualProductionReviewSummary,
} from "./types";
import { auditVisualRhythm, pacingBeat, visualWeightForLayout } from "./visual-rhythm";

function buildTypography(eraNotes: string | undefined): VisualProductionPlan["typographyProfile"] {
  const era = eraNotes?.includes("1970") ? "1970s editorial" : "Retroverse editorial";
  return {
    display: era.includes("1970") ? "Cooper Black / bold serif display" : "Editorial serif display",
    body: era.includes("1970") ? "Helvetica / clean sans body" : "Readable sans-serif body",
    era,
  };
}

function buildComposition(
  headline: string,
  layout: ProducedScene["layout"],
  artBrief: { primaryFocus: string; supportingElements: string[] } | undefined,
  media: ProducedScene["media"],
): ProducedSceneComposition {
  const hero = artBrief?.primaryFocus ?? media.mediaRole ?? headline;
  const secondary = headline.trim() || (artBrief?.supportingElements[0] ?? "Supporting narrative");
  const supporting = artBrief?.supportingElements.slice(1, 3).join(" · ") || "Context metadata";
  const eyePath =
    layout === "hero"
      ? "Artwork → Title → Artist"
      : layout === "timeline"
        ? "Peak stat → Chart line → Context"
        : layout === "performance_reel"
          ? "Stage still → Headline → Date"
          : "Headline → Hero visual → Supporting detail";

  return { heroElement: hero, secondary, supporting, eyePath };
}

export async function runVisualProducer(rvtrInput: string): Promise<VisualProductionPlan | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const [director, collector] = await Promise.all([
    loadDirectorPackage(rvtr),
    loadCollectorPackage(rvtr),
  ]);
  if (!director?.experiencePlan) return null;

  const storyPlan = director.storyPlan;
  const pages = storyPlan?.pages ?? [];
  const storyboard = storyPlan?.storyboard ?? [];
  const orderedPageIds = storyboard.flatMap((b) => b.pageIds);
  const pageById = new Map(pages.map((p) => [p.id, p]));

  let orderedPages: DirectorStoryPage[] =
    orderedPageIds.length > 0
      ? orderedPageIds.map((id) => pageById.get(id)).filter((p): p is DirectorStoryPage => Boolean(p))
      : pages;

  if (orderedPages.length === 0) {
    orderedPages = director.experiencePlan.scenes.map((scene, i) => ({
      id: `scene-${scene.sceneNumber}`,
      storyId: scene.narrativePurpose.split(":")[1] ?? "unknown",
      exhibitId: scene.narrativePurpose.split(":")[3] ?? `exhibit-${i}`,
      title: scene.title,
      headline: scene.headline,
      supportingCopy: scene.supportingCopy,
      sceneNumber: scene.sceneNumber,
      factIds: scene.linkedFactIds ?? [],
      mediaIds: scene.linkedImageAssetIds ?? [],
      templateId: scene.recommendedTemplate?.templateId ?? scene.sceneType,
    }));
  }

  const artByStory = new Map((storyPlan?.artDirectionBriefs ?? []).map((b) => [b.storyId, b]));
  const expByStory = new Map((storyPlan?.experienceConcepts ?? []).map((c) => [c.storyId, c]));

  const usedMedia = new Set<string>();
  const produced: ProducedScene[] = [];
  let prevFamily: string | null = null;

  for (let i = 0; i < orderedPages.length; i++) {
    const page = orderedPages[i]!;
    const artBrief = artByStory.get(page.storyId);
    const expConcept = expByStory.get(page.storyId);
    const { layout, presentationLayout } = selectLayout(page, artBrief);
    const media = selectMedia(page, layout, artBrief, collector, usedMedia);
    const family = rhythmFamily(layout);
    const transition = designTransition(artBrief, layout, prevFamily, artBrief?.emotionalTone);
    prevFamily = family;

    produced.push({
      sceneNumber: page.sceneNumber ?? i + 1,
      pageId: page.id,
      storyId: page.storyId,
      exhibitId: page.exhibitId,
      headline: page.headline,
      layout,
      presentationLayout,
      typography: {
        display: buildTypography(artBrief?.eraNotes).display,
        body: buildTypography(artBrief?.eraNotes).body,
        emphasis:
          page.templateId === "chart" || page.templateId === "timeline"
            ? "stat"
            : page.templateId === "quote"
              ? "pull_quote"
              : "headline",
      },
      composition: buildComposition(page.headline, layout, artBrief, media),
      media,
      rhythm: {
        visualWeight: visualWeightForLayout(layout),
        pacingBeat: pacingBeat(i, orderedPages.length, artBrief?.emotionalTone ?? "Curiosity"),
        family,
      },
      transition,
      artDirectionId: artBrief?.id ?? "",
      experienceConceptTitle: expConcept?.conceptTitle ?? page.title,
      mood: artBrief?.emotionalTone ?? expConcept?.mood ?? "Editorial",
      palette: artBrief?.colorPalette ?? [],
    });
  }

  const rhythm = auditVisualRhythm(produced);
  const review = runProductionReview(produced, rhythm.warnings);
  const typographyProfile = buildTypography(produced[0] ? artByStory.get(produced[0].storyId)?.eraNotes : undefined);

  const plan: VisualProductionPlan = {
    version: 1,
    rvtr,
    generatedAt: new Date().toISOString(),
    directorStoryPlanVersion: storyPlan?.version ?? null,
    typographyProfile,
    overallRhythm: rhythm.overallRhythm,
    creativeIdentity:
      storyPlan?.artDirectionOverview?.overallCreativeIdentity ??
      `${director.artist} — ${director.title} visual production`,
    scenes: produced,
    review,
  };

  await saveVisualProduction(plan);
  return plan;
}

export function summarizeVisualProduction(plan: VisualProductionPlan | null): VisualProductionReviewSummary | null {
  if (!plan) return null;
  const warnings = [
    ...plan.review.visualRepetitionWarnings,
    ...plan.review.missingHeroImages,
    ...plan.review.weakCompositionWarnings,
  ];
  return {
    productionScore: plan.review.productionScore,
    passed: plan.review.passed,
    sceneCount: plan.scenes.length,
    layoutTypes: [...new Set(plan.scenes.map((s) => s.layout))],
    warningCount: warnings.length,
    topWarnings: warnings.slice(0, 5),
  };
}
