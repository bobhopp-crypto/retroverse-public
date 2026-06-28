/**
 * Sprint 3.37 — Media selection respecting Art Direction, avoiding repetition.
 */

import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { DirectorArtDirectionBrief } from "@/lib/ops/studio/director/storytelling/types";
import type { DirectorStoryPage } from "@/lib/ops/studio/director/storytelling/types";

import type { ProducedSceneMedia, ProducerLayoutType } from "./types";

export function selectMedia(
  page: DirectorStoryPage,
  layout: ProducerLayoutType,
  artBrief: DirectorArtDirectionBrief | undefined,
  collector: CollectorPackage | null,
  usedMediaIds: Set<string>,
): ProducedSceneMedia {
  const pageMedia = page.mediaIds.filter((id) => !usedMediaIds.has(id));
  const heroIds: string[] = [];
  const supportingIds: string[] = [];

  if (pageMedia.length > 0) {
    heroIds.push(pageMedia[0]!);
    usedMediaIds.add(pageMedia[0]!);
    for (const id of pageMedia.slice(1, 3)) {
      supportingIds.push(id);
      usedMediaIds.add(id);
    }
  } else if (layout === "hero" && collector?.visualAssets?.coverUrl) {
    const coverId = "cover-" + collector.rvtr;
    if (!usedMediaIds.has(coverId)) {
      heroIds.push(coverId);
      usedMediaIds.add(coverId);
    }
  }

  let mediaRole = "supporting illustration";
  if (layout === "hero") mediaRole = artBrief?.primaryFocus ?? "album cover hero";
  else if (layout === "performance_reel") mediaRole = "performance stills";
  else if (layout === "timeline") mediaRole = "chart animation";
  else if (layout === "data_visualization") mediaRole = "DNA visualization";
  else if (layout === "record_sleeve") mediaRole = "album sleeve";
  else if (heroIds.length > 0) mediaRole = artBrief?.primaryFocus ?? "scene photograph";

  return {
    heroMediaIds: heroIds,
    supportingMediaIds: supportingIds,
    mediaRole,
  };
}
