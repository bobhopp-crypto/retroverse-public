import { buildMediaLabPerformanceHref } from "@/lib/ops/media-lab/workspace/urls";

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

/** @deprecated Use buildMediaLabPerformanceHref — opens unified workspace editor */
export function buildClipReviewMediaLabHref(params: {
  episodeId: string;
  performanceId: string;
  artist?: string;
  title?: string;
  startTime?: number;
  endTime?: number;
  adjustedStart?: number;
  adjustedEnd?: number;
  returnHref?: string;
  library?: "performances" | "recent";
}): string {
  void params.artist;
  void params.title;
  void params.startTime;
  void params.endTime;
  void params.adjustedStart;
  void params.adjustedEnd;
  void params.returnHref;
  return buildMediaLabPerformanceHref({
    episodeId: params.episodeId,
    performanceId: params.performanceId,
    collection: MS_COLLECTION_ID,
    library: params.library ?? "performances",
  });
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
    startTime: record.start_seconds,
    endTime: record.end_seconds,
    adjustedStart: record.adjusted_start,
    adjustedEnd: record.adjusted_end,
    returnHref,
  });
}
