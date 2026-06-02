import type { ProducerAssetCategoryId } from "./types";

/** Default source runtime when metadata has no duration (seconds). */
export const PRODUCER_DEFAULT_RUNTIME_SECONDS: Record<
  ProducerAssetCategoryId,
  number
> = {
  songs: 210,
  albums: 180,
  commercials: 30,
  tv_clips: 120,
  movies: 180,
  sports: 90,
  news: 60,
  events: 90,
  bumpers: 15,
  promos: 45,
};

export const PRODUCER_DEFAULT_TARGET_RUNTIME_MINUTES = 120;

export function defaultRuntimeSecondsForCategory(
  category: ProducerAssetCategoryId,
): number {
  return PRODUCER_DEFAULT_RUNTIME_SECONDS[category] ?? 60;
}
