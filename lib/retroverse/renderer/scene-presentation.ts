import type { ChartJourneyPresentationProps } from "@/lib/chart-journey/chart-journey-presentation";
import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";

/** CSS-only derived treatments — rhythm through variation, no new assets. */
export const IMAGE_TREATMENT_CYCLE = [
  "original",
  "scanline",
  "monochrome",
  "halftone",
  "poster",
] as const;

export type ImageTreatment = (typeof IMAGE_TREATMENT_CYCLE)[number];

export type PresentationLayout =
  | "fullscreen"
  | "image_quote"
  | "minimal_fact"
  | "chart"
  | "performance"
  | "timeline"
  | "museum_identity"
  | "museum_performance"
  | "museum_dna"
  | "museum_chart"
  | "museum_iconic"
  | "museum_closing";

export type MuseumRoom =
  | "cover"
  | "chart_journey"
  | "iconic_moment"
  | "song_dna"
  | "performance"
  | "extended"
  /** @deprecated use cover */
  | "identity"
  /** @deprecated use iconic_moment */
  | "closing";

export type MuseumChartPayload = ChartJourneyPresentationProps;

export type PresentableScene = ComposedScene & {
  presentationLayout: PresentationLayout;
  imageTreatment: ImageTreatment;
  museumRoom?: MuseumRoom;
  coverUrl?: string | null;
  dnaWatercolorSvg?: string | null;
  /** Museum Song DNA — one attributed quote overlay (presentation-only). */
  museumDnaQuoteText?: string | null;
  museumDnaQuoteAttribution?: string | null;
  museumChart?: MuseumChartPayload | null;
  showcaseBadge?: boolean;
  releaseYear?: number | null;
};

function uniqueImageUrls(experience: ParsedExperience): string[] {
  const manifest = experience.spec.assetManifest;
  const urls = [
    ...(manifest.hero ?? []).map((a) => a.url),
    ...(manifest.performanceImages ?? []).map((a) => a.url),
    ...(manifest.galleryImages ?? []).map((a) => a.url),
    ...(manifest.supportingImages ?? []).map((a) => a.url),
  ].filter((u): u is string => Boolean(u));

  return [...new Set(urls)];
}

function layoutForMoment(scene: ComposedScene, index: number): PresentationLayout {
  switch (scene.momentType) {
    case "hero_moment":
      return "fullscreen";
    case "visual_break":
    case "pause_moment":
      return "fullscreen";
    case "big_quote":
      return scene.assets.imageUrls.length ? "image_quote" : "minimal_fact";
    case "chart_milestone":
    case "did_you_know":
      return scene.assets.imageUrls.length ? "chart" : "minimal_fact";
    case "performance_spotlight":
      return "performance";
    case "timeline_beat":
      return "timeline";
    case "final_reflection":
      return "fullscreen";
    default:
      return index % 3 === 0 ? "fullscreen" : "image_quote";
  }
}

function treatmentForIndex(index: number, momentType: ComposedScene["momentType"]): ImageTreatment {
  if (momentType === "timeline_beat") return "original";
  if (momentType === "chart_milestone") return "halftone";
  const offset = momentType === "hero_moment" ? 0 : 1;
  return IMAGE_TREATMENT_CYCLE[(index + offset) % IMAGE_TREATMENT_CYCLE.length]!;
}

function pickRotatedImage(
  pool: string[],
  scene: ComposedScene,
  index: number,
  previousUrl: string | null,
): string | null {
  const current = scene.assets.imageUrls[0] ?? null;
  if (pool.length === 0) return current;

  const preferred = pool[index % pool.length]!;
  if (pool.length === 1) return pool[0]!;

  if (preferred !== previousUrl) return preferred;

  const alt = pool[(index + 1) % pool.length]!;
  if (alt !== previousUrl) return alt;

  for (const url of pool) {
    if (url !== previousUrl) return url;
  }

  return preferred;
}

/** Rotate images and assign layout/treatment for presentation rhythm. */
export function polishScenesForPresentation(
  scenes: ComposedScene[],
  experience: ParsedExperience,
): PresentableScene[] {
  const pool = uniqueImageUrls(experience);
  let previousUrl: string | null = null;

  return scenes.map((scene, index) => {
    const rotated = pickRotatedImage(pool, scene, index, previousUrl);
    if (rotated) previousUrl = rotated;

    const imageUrls = rotated ? [rotated] : scene.assets.imageUrls;
    const imageAssetIds = rotated
      ? scene.assets.imageAssetIds.slice(0, 1)
      : scene.assets.imageAssetIds;

    return {
      ...scene,
      assets: {
        ...scene.assets,
        imageUrls,
        imageAssetIds,
      },
      presentationLayout: layoutForMoment(scene, index),
      imageTreatment: treatmentForIndex(index, scene.momentType),
    };
  });
}

export function imageTreatmentClass(treatment: ImageTreatment): string {
  return treatment === "original" ? "" : `rv-exp-companion__image--${treatment}`;
}

export function layoutClass(layout: PresentationLayout): string {
  return `rv-exp-companion--layout-${layout}`;
}

export function isMuseumLayout(layout: PresentationLayout): boolean {
  return layout.startsWith("museum_");
}
