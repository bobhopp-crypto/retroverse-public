/**
 * Structured Collection processing mode — chapter-first performance extraction.
 * Does not require Media Lab transcription before candidate review.
 */

import { collectionSlugFromId } from "../paths";
import { ensureCandidateManifest } from "./candidates";
import { analyzeMidnightSpecialEpisode } from "./analyze-episode";
import { MS_COLLECTION_ID, msStructuredReviewHref } from "./paths";

export type StructuredCollectionMode = {
  mode: "structured_collection";
  collection_id: string;
  episode_id: string;
  review_href: string;
  media_lab_href: string;
  requires_transcription: false;
  steps: ["analyze_episode", "generate_candidates", "review_candidates", "export_accepted"];
};

export function buildStructuredMediaLabHref(episodeId: string): string {
  const slug = collectionSlugFromId(MS_COLLECTION_ID);
  const params = new URLSearchParams({
    collection: slug,
    episode: episodeId,
    mode: "structured_collection",
  });
  return `/ops/media-lab?${params.toString()}`;
}

export async function resolveStructuredCollectionMode(
  episodeId: string,
): Promise<StructuredCollectionMode | null> {
  const analysis = await analyzeMidnightSpecialEpisode(episodeId);
  if (!analysis?.video_path) return null;

  const manifest = await ensureCandidateManifest(episodeId);
  if (!manifest) return null;

  return {
    mode: "structured_collection",
    collection_id: MS_COLLECTION_ID,
    episode_id: episodeId,
    review_href: msStructuredReviewHref(episodeId),
    media_lab_href: buildStructuredMediaLabHref(episodeId),
    requires_transcription: false,
    steps: ["analyze_episode", "generate_candidates", "review_candidates", "export_accepted"],
  };
}
