import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

/** `RETROVERSE_DATA/media_collections` */
export function mediaCollectionsRoot(): string {
  return join(retroverseDataRoot(), "media_collections");
}

/** Collection id uses snake_case on disk (`midnight_special`). URL slugs use kebab-case. */
export function collectionIdFromSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function collectionSlugFromId(id: string): string {
  return id.trim().toLowerCase().replace(/_/g, "-");
}

export function collectionDir(collectionId: string): string {
  return join(mediaCollectionsRoot(), collectionId);
}

export function collectionsIndexPath(): string {
  return join(mediaCollectionsRoot(), "collections.json");
}

export function collectionJsonPath(collectionId: string): string {
  return join(collectionDir(collectionId), "collection.json");
}

export function collectionManifestPath(collectionId: string): string {
  return join(collectionDir(collectionId), "manifest.json");
}

export function collectionSubdir(collectionId: string, sub: keyof CollectionSubdirs): string {
  return join(collectionDir(collectionId), sub);
}

type CollectionSubdirs = {
  episodes: string;
  manifests: string;
  metadata: string;
  descriptions: string;
  transcripts: string;
  downloads: string;
};

export const COLLECTION_SUBDIRS: (keyof CollectionSubdirs)[] = [
  "episodes",
  "manifests",
  "metadata",
  "descriptions",
  "transcripts",
  "downloads",
];

export function episodeManifestPath(collectionId: string, episodeId: string): string {
  return join(collectionSubdir(collectionId, "episodes"), `${episodeId}.json`);
}
