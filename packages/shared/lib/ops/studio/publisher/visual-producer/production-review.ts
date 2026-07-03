/**
 * Sprint 3.37 — Visual Producer final production check.
 */

import type { ProducedScene, VisualProductionReview } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function runProductionReview(scenes: ProducedScene[], rhythmWarnings: string[]): VisualProductionReview {
  const visualRepetitionWarnings: string[] = [...rhythmWarnings];
  const missingHeroImages: string[] = [];
  const oversizedTextWarnings: string[] = [];
  const weakCompositionWarnings: string[] = [];
  const transitionWarnings: string[] = [];

  const layoutCounts = new Map<string, number>();
  for (const scene of scenes) {
    layoutCounts.set(scene.layout, (layoutCounts.get(scene.layout) ?? 0) + 1);

    const needsHero =
      scene.layout === "hero" ||
      scene.layout === "performance_reel" ||
      scene.layout === "gallery" ||
      scene.layout === "record_sleeve";
    if (needsHero && scene.media.heroMediaIds.length === 0 && scene.layout !== "data_visualization") {
      missingHeroImages.push(`Scene ${scene.sceneNumber} "${scene.headline}" — no hero media assigned`);
    }

    if (scene.headline.length > 80) {
      oversizedTextWarnings.push(`Scene ${scene.sceneNumber} headline exceeds readable length`);
    }

    if (!scene.composition.heroElement || scene.composition.heroElement === scene.composition.secondary) {
      weakCompositionWarnings.push(`Scene ${scene.sceneNumber} — weak hero/secondary hierarchy`);
    }

    if (scene.transition.continuityNote.includes("Contrast shift")) {
      transitionWarnings.push(`Scene ${scene.sceneNumber}: ${scene.transition.continuityNote}`);
    }
  }

  for (const [layout, count] of layoutCounts) {
    if (count >= 4) {
      visualRepetitionWarnings.push(`Layout "${layout}" used ${count} times — consider more variety`);
    }
  }

  let score = 100;
  score -= missingHeroImages.length * 12;
  score -= oversizedTextWarnings.length * 6;
  score -= weakCompositionWarnings.length * 8;
  score -= visualRepetitionWarnings.length * 5;
  score -= transitionWarnings.length * 2;

  const passed =
    missingHeroImages.length === 0 &&
    weakCompositionWarnings.length <= 1 &&
    score >= 65;

  return {
    productionScore: clamp(score),
    layoutConsistency: visualRepetitionWarnings.length <= 2,
    mediaQuality: missingHeroImages.length === 0,
    typographyHierarchy: oversizedTextWarnings.length === 0,
    spacingRhythm: rhythmWarnings.length <= 1,
    visualRepetitionWarnings,
    missingHeroImages,
    oversizedTextWarnings,
    weakCompositionWarnings,
    transitionWarnings,
    passed,
  };
}
