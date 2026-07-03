import { collectionSlugFromId } from "./paths";
import { loadEpisode } from "./state";
import type { MediaLabCollectionLink } from "./types";

/**
 * Integration point: Collection → Episode → Media Lab.
 *
 * Media Lab will read `collection` + `episode` query params to pre-load a job
 * or surface the local download for transcription. No Media Lab redesign in this pass.
 */
export function buildMediaLabHref(
  collectionId: string,
  episodeId: string,
  opts?: {
    mediaLabYear?: number;
    mediaLabJobSlug?: string;
    sourceVideoPath?: string;
  },
): string {
  const slug = collectionSlugFromId(collectionId);
  const params = new URLSearchParams({
    collection: slug,
    episode: episodeId,
  });
  if (opts?.mediaLabYear) params.set("year", String(opts.mediaLabYear));
  if (opts?.mediaLabJobSlug) params.set("job", opts.mediaLabJobSlug);
  if (opts?.sourceVideoPath) params.set("video", opts.sourceVideoPath);
  return `/ops/media-lab?${params.toString()}`;
}

export async function resolveMediaLabLink(
  collectionId: string,
  episodeId: string,
): Promise<MediaLabCollectionLink | null> {
  const episode = await loadEpisode(collectionId, episodeId);
  if (!episode) return null;

  if (episode.media_lab_job_slug && episode.media_lab_year) {
    return {
      collection_id: collectionId,
      episode_id: episodeId,
      status: "has_job",
      media_lab_year: episode.media_lab_year,
      media_lab_job_slug: episode.media_lab_job_slug,
      source_video_path: episode.download_path,
      media_lab_href: buildMediaLabHref(collectionId, episodeId, {
        mediaLabYear: episode.media_lab_year,
        mediaLabJobSlug: episode.media_lab_job_slug,
        sourceVideoPath: episode.download_path,
      }),
    };
  }

  if (episode.download_path) {
    return {
      collection_id: collectionId,
      episode_id: episodeId,
      status: "ready_to_import",
      source_video_path: episode.download_path,
      media_lab_href: buildMediaLabHref(collectionId, episodeId, {
        sourceVideoPath: episode.download_path,
      }),
    };
  }

  return {
    collection_id: collectionId,
    episode_id: episodeId,
    status: "not_downloaded",
    media_lab_href: buildMediaLabHref(collectionId, episodeId),
  };
}
