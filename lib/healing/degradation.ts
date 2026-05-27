/** Degradation flags for canonical enrichment healing (read-only queue). */

export type HealingDegradationFlag =
  | "missing_album_links"
  | "missing_cover"
  | "duplicate_title_artist"
  | "orphan_vdj"
  | "stand_by_me_cluster";

export const HEALING_DEGRADATION_LABELS: Record<HealingDegradationFlag, string> = {
  missing_album_links: "Missing album links",
  missing_cover: "Missing cover",
  duplicate_title_artist: "Duplicate title/artist",
  orphan_vdj: "Orphan VDJ link",
  stand_by_me_cluster: "Stand By Me cluster",
};

export type HealingDegradationCounts = Record<HealingDegradationFlag, number>;

export type HealingQueueState =
  | "degraded"
  | "linked"
  | "no_candidates"
  | "candidates_ready";

export type HealingCoverStatus = "ok" | "missing" | "no_album_link";
