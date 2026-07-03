import type { DirectorRenderSpec } from "@/lib/ops/studio/director/render-spec-types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";

import type { PerformanceFrame } from "./types";

export function extractPerformanceFrames(experience: ParsedExperience): PerformanceFrame[] {
  const manifest = experience.spec.assetManifest;
  const seen = new Set<string>();
  const frames: PerformanceFrame[] = [];

  const sources = [
    ...(manifest.performanceImages ?? []),
    ...(manifest.hero ?? []),
    ...(manifest.galleryImages ?? []),
  ];

  for (const asset of sources) {
    if (!asset.url || seen.has(asset.id)) continue;
    seen.add(asset.id);
    frames.push({
      id: asset.id,
      imageUrl: asset.url,
      caption: asset.caption,
      performanceId: asset.performanceId,
      role: asset.role,
      sceneNumbers: asset.sceneNumbers ?? [],
    });
  }

  if (frames.length === 0) {
    for (const scene of experience.scenes) {
      for (let i = 0; i < scene.assets.imageUrls.length; i++) {
        const url = scene.assets.imageUrls[i];
        const id = scene.assets.imageAssetIds[i] ?? `scene-${scene.sceneNumber}-${i}`;
        if (!url || seen.has(id)) continue;
        seen.add(id);
        frames.push({
          id,
          imageUrl: url,
          caption: scene.headline,
          performanceId: scene.assets.performanceId,
          role: "scene_image",
          sceneNumbers: [scene.sceneNumber],
        });
      }
    }
  }

  return frames;
}

export function pickPrimaryFrame(
  frames: PerformanceFrame[],
  spec: DirectorRenderSpec,
): PerformanceFrame | null {
  if (frames.length === 0) return null;
  const perfId = spec.metadata.primaryPerformance?.performanceId;
  const perfFrame = frames.find(
    (f) => f.role.includes("performance") || (perfId && f.performanceId === perfId),
  );
  return perfFrame ?? frames[0] ?? null;
}
