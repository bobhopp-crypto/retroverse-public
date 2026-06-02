import type { YearWorkspaceCategoryId } from "../types";

/** Asset library shelf in Producer View (rundown board). */
export type ProducerAssetCategoryId =
  | "songs"
  | "albums"
  | "commercials"
  | "tv_clips"
  | "movies"
  | "sports"
  | "news"
  | "events"
  | "bumpers"
  | "promos";

export type ProducerNeedFoundReady = {
  need: number;
  found: number;
  ready: number;
  /** Assets still not cleared for air (need − ready). */
  missing: number;
};

export type ProducerTimelineBlockId =
  | "opening"
  | "music_block"
  | "commercial_break"
  | "tv_memory"
  | "news_moment"
  | "feature_segment"
  | "closing";

export type ProducerTimelineAsset = {
  id: string;
  producerCategory: ProducerAssetCategoryId;
  productionCategory: YearWorkspaceCategoryId;
  productionItemId: string;
  title: string;
  subtitle: string | null;
  /** Source/metadata runtime in seconds. */
  runtimeSeconds: number;
  /** Trimmed or faded runtime; when set, used instead of runtimeSeconds. */
  runtimeOverrideSeconds?: number | null;
};

export type ProducerTimelineState = {
  version: 1;
  year: number;
  targetRuntimeMinutes: number;
  blocks: Record<ProducerTimelineBlockId, ProducerTimelineAsset[]>;
  updatedAt: string;
};

export type ProducerLibraryAsset = {
  id: string;
  producerCategory: ProducerAssetCategoryId;
  productionCategory: YearWorkspaceCategoryId;
  productionItemId: string;
  title: string;
  subtitle: string | null;
  status: "need" | "found" | "ready";
  runtimeSeconds: number;
};
