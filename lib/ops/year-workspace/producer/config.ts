import type { YearWorkspaceCategoryId } from "../types";

import type { ProducerAssetCategoryId } from "./types";

/** @deprecated v1 — use ordered blocks in timeline v2. Kept for docs/tests. */
export type { ProducerTimelineLegacyBlockId as ProducerTimelineBlockId } from "./types";

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

export function producerCategoryLabel(id: ProducerAssetCategoryId): string {
  return PRODUCER_ASSET_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function productionCategoryForProducer(
  id: ProducerAssetCategoryId,
): YearWorkspaceCategoryId | null {
  return PRODUCER_ASSET_CATEGORIES.find((c) => c.id === id)?.productionCategory ?? null;
}
