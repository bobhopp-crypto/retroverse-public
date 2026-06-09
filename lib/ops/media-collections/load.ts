import { buildDownloadProgress, loadDownloadRunState } from "./download-state";
import { auditCollectionDownloadHealth } from "./classify-download";
import { collectionSlugFromId, mediaCollectionsRoot } from "./paths";
import { loadCollectionStorageStats } from "./storage-stats";
import {
  loadCollection,
  loadCollectionManifest,
  loadCollectionsIndex,
  listEpisodes,
} from "./state";
import type { MsPerformanceCollectionIndex } from "./midnight-special/types";
import { loadPerformanceIndex } from "./midnight-special/performances";
import { MS_COLLECTION_ID } from "./midnight-special/paths";
import type {
  CollectionCardData,
  CollectionDownloadHealth,
  CollectionManifest,
  EpisodeManifest,
  MediaCollection,
} from "./types";
import type { DownloadRunState } from "./download-state";

export type MediaCollectionsConsoleData = {
  collections: CollectionCardData[];
  data_root: string;
};

export type MediaCollectionDetailData = {
  collection: MediaCollection;
  manifest: CollectionManifest;
  episodes: EpisodeManifest[];
  storage: Awaited<ReturnType<typeof loadCollectionStorageStats>>;
  download_progress: DownloadRunState;
  download_health: CollectionDownloadHealth;
  slug: string;
  performance_index?: MsPerformanceCollectionIndex | null;
};

export async function loadMediaCollectionsConsole(): Promise<MediaCollectionsConsoleData> {
  const index = await loadCollectionsIndex();
  const cards: CollectionCardData[] = [];

  for (const collection of index.collections) {
    const [storage, manifest, run] = await Promise.all([
      loadCollectionStorageStats(collection.id),
      loadCollectionManifest(collection.id),
      loadDownloadRunState(collection.id),
    ]);
    const progress = await buildDownloadProgress(collection.id, run);
    cards.push({
      ...collection,
      slug: collectionSlugFromId(collection.id),
      storage_root: manifest?.storage_root ?? "",
      storage,
      download_running: progress.running,
    });
  }

  return {
    collections: cards,
    data_root: mediaCollectionsRoot(),
  };
}

export async function loadMediaCollectionDetail(
  collectionId: string,
): Promise<MediaCollectionDetailData | null> {
  const collection = await loadCollection(collectionId);
  if (!collection) return null;

  const manifest = await loadCollectionManifest(collectionId);
  if (!manifest) return null;

  const [episodes, storage, run] = await Promise.all([
    listEpisodes(collectionId),
    loadCollectionStorageStats(collectionId),
    loadDownloadRunState(collectionId),
  ]);
  const download_progress = await buildDownloadProgress(collectionId, run);
  const download_health = await auditCollectionDownloadHealth(collectionId, episodes);
  const performance_index =
    collectionId === MS_COLLECTION_ID ? await loadPerformanceIndex() : null;

  return {
    collection,
    manifest,
    episodes,
    storage,
    download_progress,
    download_health,
    slug: collectionSlugFromId(collectionId),
    performance_index,
  };
}
