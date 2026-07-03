import { buildDownloadProgress, loadDownloadRunState } from "./download-state";
import { auditCollectionDownloadHealth, type CollectionDownloadHealth } from "./classify-download";
import { collectionSlugFromId, mediaCollectionsRoot } from "./paths";
import { loadCollectionStorageStats } from "./storage-stats";
import {
  loadCollection,
  loadCollectionManifest,
  loadCollectionsIndex,
  listEpisodes,
} from "./state";
import { loadMidnightSpecialCoverage } from "./midnight-special/coverage";
import type {
  MsPerformanceCollectionIndex,
  MsSyncStatusSummary,
} from "./midnight-special/types";
import { loadPerformanceIndex } from "./midnight-special/performances";
import { MS_HISTORICAL_EPISODE_COUNT } from "./midnight-special/constants";
import { loadMsSyncState } from "./midnight-special/sync-state";
import { MS_COLLECTION_ID } from "./midnight-special/paths";
import type {
  CollectionCardData,
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
  ms_sync?: MsSyncStatusSummary | null;
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
  const isMidnightSpecial = collectionId === MS_COLLECTION_ID;
  const [performance_index, ms_sync] = await Promise.all([
    isMidnightSpecial ? loadPerformanceIndex() : Promise.resolve(null),
    isMidnightSpecial ? loadMidnightSpecialSyncSummary(collection) : Promise.resolve(null),
  ]);

  return {
    collection,
    manifest,
    episodes,
    storage,
    download_progress,
    download_health,
    slug: collectionSlugFromId(collectionId),
    performance_index,
    ms_sync,
  };
}

async function loadMidnightSpecialSyncSummary(
  collection: MediaCollection,
): Promise<MsSyncStatusSummary> {
  const syncState = await loadMsSyncState();
  const published =
    syncState.last_official_playlist_count > 0
      ? syncState.last_official_playlist_count
      : collection.episode_count;
  const coverage = await loadMidnightSpecialCoverage(published);

  return {
    coverage,
    last_sync_at: syncState.last_sync_at,
    new_episodes_since_last_sync: syncState.new_episodes_since_last_sync,
    official_playlist_count: published,
    historical_episode_count: MS_HISTORICAL_EPISODE_COUNT,
  };
}
