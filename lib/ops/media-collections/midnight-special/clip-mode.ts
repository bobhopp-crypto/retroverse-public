import { collectionSlugFromId } from "../paths";
import { MS_COLLECTION_ID } from "./paths";

export type ClipReviewModeParams = {
  collection_id: string;
  episode_id: string;
  performance_id: string;
  artist: string;
  title: string;
  start_time: number;
  end_time: number;
  return_href?: string;
};

export function buildClipReviewMediaLabHref(params: {
  episodeId: string;
  performanceId: string;
  artist?: string;
  title?: string;
  startTime?: number;
  endTime?: number;
  returnHref?: string;
}): string {
  const slug = collectionSlugFromId(MS_COLLECTION_ID);
  const search = new URLSearchParams({
    collection: slug,
    episode: params.episodeId,
    mode: "clip_review",
    performance: params.performanceId,
  });
  if (params.artist) search.set("artist", params.artist);
  if (params.title) search.set("title", params.title);
  if (params.startTime != null) search.set("start", String(params.startTime));
  if (params.endTime != null) search.set("end", String(params.endTime));
  search.set(
    "return",
    params.returnHref ?? "/ops/media-collections/midnight-special/review?mode=queue",
  );
  return `/ops/media-lab?${search.toString()}`;
}

export function buildClipReviewHrefFromRecord(
  record: {
    episode_id: string;
    performance_id: string;
    artist: string;
    song: string;
    start_seconds: number;
    end_seconds: number;
    adjusted_start?: number;
    adjusted_end?: number;
  },
  returnHref?: string,
): string {
  const start = record.adjusted_start ?? record.start_seconds;
  const end = record.adjusted_end ?? record.end_seconds;
  return buildClipReviewMediaLabHref({
    episodeId: record.episode_id,
    performanceId: record.performance_id,
    artist: record.artist,
    title: record.song,
    startTime: start,
    endTime: end,
    returnHref,
  });
}
