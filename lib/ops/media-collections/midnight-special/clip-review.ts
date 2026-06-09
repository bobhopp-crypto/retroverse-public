import { performanceEffectiveBounds } from "./effective-bounds";
import { loadEpisodePerformanceManifest } from "./performances";
import { MS_COLLECTION_ID } from "./paths";
import type { MsClipReviewContext } from "./types";

export async function loadClipReviewContext(
  episodeId: string,
  performanceId: string,
  returnHref = "/ops/media-collections/midnight-special/review?mode=queue",
): Promise<MsClipReviewContext | null> {
  const manifest = await loadEpisodePerformanceManifest(episodeId);
  if (!manifest) return null;

  const record = manifest.performances.find((p) => p.performance_id === performanceId);
  if (!record) return null;

  const bounds = performanceEffectiveBounds(record);
  const video_url = `/api/ops/media-collections/midnight-special/video?episode=${encodeURIComponent(episodeId)}`;

  return {
    collection_id: MS_COLLECTION_ID,
    episode_id: episodeId,
    performance_id: performanceId,
    episode_title: manifest.episode_title,
    air_date: manifest.air_date ?? record.air_date,
    artist: record.artist,
    title: record.song,
    detected_start: record.start_seconds,
    detected_end: record.end_seconds,
    effective_start: bounds.start,
    effective_end: bounds.end,
    detected_start_timecode: record.start_timecode,
    detected_end_timecode: record.end_timecode,
    effective_start_timecode: bounds.start_timecode,
    effective_end_timecode: bounds.end_timecode,
    status: record.status,
    video_url,
    return_href: returnHref,
    modified_at: record.modified_at,
  };
}
