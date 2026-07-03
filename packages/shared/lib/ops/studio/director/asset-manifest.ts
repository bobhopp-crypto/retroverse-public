/**
 * Director 0.3 — unified asset manifest for render spec.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import type { AssetManifest, ManifestAsset } from "./render-spec-types";
import type { ExperiencePlan, ExperienceScene } from "./types";

function emptyManifest(): AssetManifest {
  return {
    hero: [],
    supportingImages: [],
    performanceImages: [],
    galleryImages: [],
    timelineData: [],
    charts: [],
    quotes: [],
    facts: [],
    logos: [],
  };
}

function pushUnique(
  list: ManifestAsset[],
  asset: ManifestAsset,
): void {
  const existing = list.find((a) => a.id === asset.id);
  if (existing) {
    for (const n of asset.sceneNumbers) {
      if (!existing.sceneNumbers.includes(n)) existing.sceneNumbers.push(n);
    }
    return;
  }
  list.push(asset);
}

function extractTimelineEvents(text: string): Array<{ year: number | null; label: string }> {
  const events: Array<{ year: number | null; label: string }> = [];
  const re = /\b(19|20)\d{2}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    events.push({ year: Number(m[0]), label: text.slice(0, 80).trim() });
    if (events.length >= 6) break;
  }
  return events;
}

export function buildAssetManifest(
  handoff: DirectorEditorialPackage,
  plan: ExperiencePlan,
): AssetManifest {
  const manifest = emptyManifest();
  const imageById = new Map(handoff.approvedImages.map((img) => [img.assetId, img]));

  for (const scene of plan.scenes) {
    const templateId = scene.recommendedTemplate?.templateId ?? "story";
    const sceneNum = scene.sceneNumber;

    for (let i = 0; i < scene.linkedImageAssetIds.length; i += 1) {
      const assetId = scene.linkedImageAssetIds[i]!;
      const img = imageById.get(assetId);
      const isHero = templateId === "hero" || scene.title === "Opening";
      const isGallery = templateId === "gallery" && scene.linkedImageAssetIds.length >= 2;
      const isPerf = templateId === "performance" || scene.linkedPerformanceId;

      const entry: ManifestAsset = {
        id: assetId,
        role: isHero ? "hero" : isGallery ? "gallery_image" : isPerf ? "performance_image" : "supporting_image",
        required: isHero || (templateId === "gallery" && i < 2),
        priority: isHero ? 100 : isGallery ? 70 : 50,
        url: img?.imageUrl ?? null,
        caption: img?.caption ?? null,
        performanceId: scene.linkedPerformanceId,
        sceneNumbers: [sceneNum],
      };

      if (isHero) pushUnique(manifest.hero, entry);
      else if (isGallery) pushUnique(manifest.galleryImages, entry);
      else if (isPerf) pushUnique(manifest.performanceImages, entry);
      else pushUnique(manifest.supportingImages, entry);
    }

    for (const factId of scene.linkedFactIds) {
      const fact = handoff.approvedFacts.find((f) => f.id === factId);
      pushUnique(manifest.facts, {
        id: factId,
        role: "fact",
        required: templateId === "fact_stack",
        priority: 60,
        url: null,
        caption: fact?.text ?? null,
        performanceId: null,
        sceneNumbers: [sceneNum],
      });
    }

    if (templateId === "quote" || scene.sceneType === "quote") {
      pushUnique(manifest.quotes, {
        id: `quote-scene-${sceneNum}`,
        role: "quote_text",
        required: templateId === "quote",
        priority: 65,
        url: null,
        caption: scene.supportingCopy.slice(0, 200),
        performanceId: null,
        sceneNumbers: [sceneNum],
      });
    }

    if (templateId === "timeline") {
      const events = extractTimelineEvents(scene.supportingCopy);
      pushUnique(manifest.timelineData, {
        id: `timeline-scene-${sceneNum}`,
        role: "timeline_data",
        required: true,
        priority: 75,
        url: null,
        caption: `${events.length} dated events`,
        performanceId: null,
        sceneNumbers: [sceneNum],
      });
    }

    if (templateId === "chart" || scene.sceneType === "chart") {
      pushUnique(manifest.charts, {
        id: `chart-scene-${sceneNum}`,
        role: "chart_data",
        required: true,
        priority: 80,
        url: null,
        caption: scene.headline,
        performanceId: null,
        sceneNumbers: [sceneNum],
      });
    }
  }

  if (handoff.performance.screenshots.length > 0) {
    for (const shot of handoff.performance.screenshots) {
      pushUnique(manifest.performanceImages, {
        id: shot.assetId,
        role: "performance_image",
        required: false,
        priority: 85,
        url: shot.imageUrl,
        caption: handoff.performance.title,
        performanceId: handoff.performance.id,
        sceneNumbers: plan.scenes
          .filter((s) => s.linkedPerformanceId === handoff.performance.id)
          .map((s) => s.sceneNumber),
      });
    }
  }

  return manifest;
}

export function validateManifest(manifest: AssetManifest): {
  missingRequired: string[];
  missingOptional: string[];
} {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  const all = [
    ...manifest.hero,
    ...manifest.supportingImages,
    ...manifest.performanceImages,
    ...manifest.galleryImages,
    ...manifest.timelineData,
    ...manifest.charts,
    ...manifest.quotes,
    ...manifest.facts,
  ];

  for (const asset of all) {
    const needsUrl = asset.role !== "fact" && asset.role !== "quote_text" && asset.role !== "timeline_data" && asset.role !== "chart_data";
    if (needsUrl && !asset.url) {
      if (asset.required) missingRequired.push(asset.id);
      else missingOptional.push(asset.id);
    }
    if ((asset.role === "fact" || asset.role === "quote_text") && !asset.caption) {
      if (asset.required) missingRequired.push(asset.id);
      else missingOptional.push(asset.id);
    }
  }

  return { missingRequired, missingOptional };
}

export function sceneAssetsForRender(
  scene: ExperienceScene,
  handoff: DirectorEditorialPackage,
): {
  imageAssetIds: string[];
  imageUrls: string[];
  factIds: string[];
  factTexts: string[];
  performanceId: string | null;
  timelineEvents: Array<{ year: number | null; label: string }>;
} {
  const imageById = new Map(handoff.approvedImages.map((img) => [img.assetId, img]));
  const imageAssetIds = [...scene.linkedImageAssetIds];
  const imageUrls = imageAssetIds.map((id) => imageById.get(id)?.imageUrl ?? "");
  const factIds = [...scene.linkedFactIds];
  const factTexts = factIds.map(
    (id) => handoff.approvedFacts.find((f) => f.id === id)?.text ?? "",
  );

  const re = /\b(19|20)\d{2}\b/g;
  const timelineEvents: Array<{ year: number | null; label: string }> = [];
  let m: RegExpExecArray | null;
  const text = `${scene.headline} ${scene.supportingCopy}`;
  while ((m = re.exec(text)) !== null) {
    timelineEvents.push({ year: Number(m[0]), label: scene.headline });
    if (timelineEvents.length >= 8) break;
  }

  return {
    imageAssetIds,
    imageUrls,
    factIds,
    factTexts,
    performanceId: scene.linkedPerformanceId,
    timelineEvents,
  };
}
