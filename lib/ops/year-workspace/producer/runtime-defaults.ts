import type { ProducerAssetCategoryId } from "./types";

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

/** Categories where runtime is usually trusted without review. */
export const PRODUCER_DEFAULT_APPROVED_RUNTIME: Record<
  ProducerAssetCategoryId,
  boolean
> = {
  songs: true,
  albums: false,
  commercials: true,
  tv_clips: false,
  movies: false,
  sports: false,
  news: false,
  events: false,
  bumpers: true,
  promos: false,
};

export const PRODUCER_DEFAULT_TARGET_RUNTIME_MINUTES = 120;

export function defaultRuntimeSecondsForCategory(
  category: ProducerAssetCategoryId,
): number {
  return PRODUCER_DEFAULT_RUNTIME_SECONDS[category] ?? 60;
}

export function defaultApprovedRuntimeForCategory(
  category: ProducerAssetCategoryId,
): boolean {
  return PRODUCER_DEFAULT_APPROVED_RUNTIME[category] ?? false;
}
