/** Media Collections — acquisition and archive layer for long-form TV/media programs. */

export type CollectionSourceType =
  | "youtube_playlist"
  | "internet_archive"
  | "manual"
  | "local";

export type CollectionStatus =
  | "planned"
  | "acquiring"
  | "active"
  | "complete"
  | "paused";

export type EpisodeStatus =
  | "discovered"
  | "queued"
  | "downloading"
  | "downloaded"
  | "partial"
  | "corrupt"
  | "processing"
  | "processed"
  | "harvested"
  | "failed";

export type MediaCollection = {
  id: string;
  title: string;
  source_type: CollectionSourceType;
  source_url: string;
  description: string;
  status: CollectionStatus;
  episode_count: number;
  downloaded_count: number;
  processed_count: number;
  harvested_count: number;
  created_at: string;
  updated_at: string;
};

export type CollectionsIndex = {
  version: 1;
  collections: MediaCollection[];
  updated_at: string;
};

export type CollectionPaths = {
  episodes: string;
  manifests: string;
  metadata: string;
  descriptions: string;
  transcripts: string;
  downloads: string;
};

export type CollectionManifest = {
  version: 1;
  collection: MediaCollection;
  storage_root: string;
  paths: CollectionPaths;
  last_scan_at?: string;
  last_scan_episode_count?: number;
};

export type EpisodeManifest = {
  version: 1;
  id: string;
  collection_id: string;
  title: string;
  episode_number?: string;
  air_date?: string;
  duration_seconds?: number;
  source_url: string;
  source_video_id?: string;
  playlist_index?: number;
  status: EpisodeStatus;
  downloaded: boolean;
  processed: boolean;
  harvested: boolean;
  download_path?: string;
  media_lab_job_slug?: string;
  media_lab_year?: number;
  discovered_at: string;
  updated_at: string;
};

export type CollectionStorageStats = {
  downloads_file_count: number;
  downloads_bytes: number;
  metadata_file_count: number;
  transcripts_file_count: number;
  total_bytes: number;
};

export type CollectionCardData = MediaCollection & {
  slug: string;
  storage_root: string;
  storage: CollectionStorageStats;
  download_running: boolean;
};

export type PlaylistScanResult = {
  ok: boolean;
  collection_id: string;
  scanned_at: string;
  episodes_found: number;
  episodes_new: number;
  episodes_updated: number;
  error?: string;
  method: "yt-dlp" | "stub";
};

/** Integration contract: Collection → Episode → Media Lab. */
export type MediaLabCollectionLink = {
  collection_id: string;
  episode_id: string;
  status: "not_downloaded" | "ready_to_import" | "has_job";
  source_video_path?: string;
  media_lab_year?: number;
  media_lab_job_slug?: string;
  /** Pre-filled Media Lab route (query params are the integration contract). */
  media_lab_href: string;
};
