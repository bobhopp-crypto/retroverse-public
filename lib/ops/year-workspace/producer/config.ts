import type { YearWorkspaceCategoryId } from "../types";

import type { ProducerAssetCategoryId, ProducerTimelineBlockId } from "./types";

export const PRODUCER_ASSET_CATEGORIES: {
  id: ProducerAssetCategoryId;
  label: string;
  /** Production file backing this shelf (null = empty shelf until curated). */
  productionCategory: YearWorkspaceCategoryId | null;
}[] = [
  { id: "songs", label: "Songs", productionCategory: "songs" },
  { id: "albums", label: "Albums", productionCategory: "albums" },
  { id: "commercials", label: "Commercials", productionCategory: "commercials" },
  { id: "tv_clips", label: "TV Clips", productionCategory: "tv_clips" },
  { id: "movies", label: "Movies", productionCategory: "promos" },
  { id: "sports", label: "Sports", productionCategory: "events" },
  { id: "news", label: "News", productionCategory: "events" },
  { id: "events", label: "Events", productionCategory: "events" },
  { id: "bumpers", label: "Bumpers", productionCategory: "bumpers" },
  { id: "promos", label: "Promos", productionCategory: "promos" },
];

/** Top rundown dashboard — no percentages. */
export const PRODUCER_DASHBOARD_CATEGORIES: ProducerAssetCategoryId[] = [
  "songs",
  "commercials",
  "tv_clips",
  "events",
  "bumpers",
];

export const PRODUCER_TIMELINE_BLOCKS: {
  id: ProducerTimelineBlockId;
  label: string;
  hint: string;
}[] = [
  { id: "opening", label: "Opening", hint: "Cold open · station ID · first energy" },
  {
    id: "music_block",
    label: "Music Block",
    hint: "Billboard spine · singalongs · dance floor",
  },
  {
    id: "commercial_break",
    label: "Commercial Break",
    hint: "Period ads · sponsors · bumpers in and out",
  },
  { id: "tv_memory", label: "TV Memory", hint: "Clips · promos · couch moments" },
  { id: "news_moment", label: "News Moment", hint: "Headlines · wire · local color" },
  {
    id: "feature_segment",
    label: "Feature Segment",
    hint: "Sports · movies · deep cut · event hook",
  },
  { id: "closing", label: "Closing", hint: "Last songs · sign-off · night cap" },
];

export function producerCategoryLabel(id: ProducerAssetCategoryId): string {
  return PRODUCER_ASSET_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function productionCategoryForProducer(
  id: ProducerAssetCategoryId,
): YearWorkspaceCategoryId | null {
  return PRODUCER_ASSET_CATEGORIES.find((c) => c.id === id)?.productionCategory ?? null;
}
