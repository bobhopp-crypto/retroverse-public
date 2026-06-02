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

/** Legacy v1 block keys (migration only). */
export type ProducerTimelineLegacyBlockId =
  | "opening"
  | "music_block"
  | "commercial_break"
  | "tv_memory"
  | "news_moment"
  | "feature_segment"
  | "closing";

export type ProducerNeedFoundReady = {
  need: number;
  found: number;
  ready: number;
  missing: number;
};

export type ProducerTimelineAsset = {
  id: string;
  producerCategory: ProducerAssetCategoryId;
  productionCategory: YearWorkspaceCategoryId;
  productionItemId: string;
  title: string;
  subtitle: string | null;
  runtimeSeconds: number;
  runtimeOverrideSeconds?: number | null;
  /** Producer confirmed runtime is close enough for show planning. */
  approvedRuntime?: boolean;
};

export type ProducerShowBlock = {
  id: string;
  title: string;
  notes: string | null;
  collapsed?: boolean;
  /** Set when migrated from v1 fixed sections. */
  legacyKey?: ProducerTimelineLegacyBlockId;
  assets: ProducerTimelineAsset[];
};

export type ProducerTimelineState = {
  version: 2;
  year: number;
  targetRuntimeMinutes: number;
  blocks: ProducerShowBlock[];
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

export type ProducerBlockTemplateId =
  | "music_segment"
  | "commercial_break"
  | "tv_memory"
  | "news_segment"
  | "feature_segment"
  | "custom";
