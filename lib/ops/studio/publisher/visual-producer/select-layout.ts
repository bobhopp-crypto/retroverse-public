/**
 * Sprint 3.37 — Layout selection from Art Direction + Experience concepts.
 */

import type { DirectorArtDirectionBrief } from "@/lib/ops/studio/director/storytelling/types";
import type { DirectorStoryPage } from "@/lib/ops/studio/director/storytelling/types";

import type { ProducerLayoutType } from "./types";

const TEMPLATE_LAYOUT: Record<string, ProducerLayoutType> = {
  hero: "hero",
  quote: "documentary_frame",
  chart: "timeline",
  timeline: "timeline",
  gallery: "gallery",
  performance: "performance_reel",
  story: "documentary_frame",
};

const ART_LAYOUT: Record<string, ProducerLayoutType> = {
  Poster: "hero",
  Magazine: "magazine_spread",
  "Film storyboard": "documentary_frame",
  Billboard: "timeline",
  "Record sleeve": "record_sleeve",
  "Museum panel": "museum_panel",
  Infographic: "data_visualization",
  "Concert flyer": "performance_reel",
  Scrapbook: "gallery",
  "TV guide": "documentary_frame",
};

const PRESENTATION_LAYOUT: Record<ProducerLayoutType, string> = {
  hero: "museum_identity",
  magazine_spread: "image_quote",
  timeline: "museum_chart",
  gallery: "fullscreen",
  record_sleeve: "museum_iconic",
  comparison: "image_quote",
  documentary_frame: "minimal_fact",
  museum_panel: "museum_closing",
  data_visualization: "museum_dna",
  performance_reel: "museum_performance",
};

export function selectLayout(
  page: DirectorStoryPage,
  artBrief: DirectorArtDirectionBrief | undefined,
): { layout: ProducerLayoutType; presentationLayout: string } {
  const fromArt = artBrief ? ART_LAYOUT[artBrief.layoutStyle] : undefined;
  const fromTemplate = TEMPLATE_LAYOUT[page.templateId] ?? "documentary_frame";
  const layout = fromArt ?? fromTemplate;
  return { layout, presentationLayout: PRESENTATION_LAYOUT[layout] };
}

export function rhythmFamily(layout: ProducerLayoutType): string {
  if (layout === "hero" || layout === "record_sleeve") return "image";
  if (layout === "timeline" || layout === "data_visualization") return "data";
  if (layout === "performance_reel" || layout === "gallery") return "photo";
  if (layout === "documentary_frame" || layout === "magazine_spread") return "text";
  if (layout === "museum_panel") return "timeline";
  return "mixed";
}
