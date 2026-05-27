/** Degradation flags for canonical enrichment healing (read-only console). */

export type HealingDegradationFlag =
  | "missing_album_links"
  | "missing_cover"
  | "duplicate_rvtr"
  | "orphan_vdj"
  | "weak_confidence_join";

export const HEALING_DEGRADATION_LABELS: Record<HealingDegradationFlag, string> = {
  missing_album_links: "Missing album links",
  missing_cover: "Missing covers",
  duplicate_rvtr: "Duplicate RVTR candidates",
  orphan_vdj: "Orphan VDJ variants",
  weak_confidence_join: "Weak-confidence joins",
};

export const HEALING_CATEGORY_PRIORITY: HealingDegradationFlag[] = [
  "duplicate_rvtr",
  "orphan_vdj",
  "missing_album_links",
  "missing_cover",
  "weak_confidence_join",
];

export type HealingDegradationCounts = Record<HealingDegradationFlag, number>;

export type HealingQueueState =
  | "degraded"
  | "linked"
  | "no_candidates"
  | "candidates_ready";

export type HealingCoverStatus = "ok" | "missing" | "no_album_link";

export function primaryHealingCategory(
  flags: HealingDegradationFlag[],
): HealingDegradationFlag | null {
  for (const flag of HEALING_CATEGORY_PRIORITY) {
    if (flags.includes(flag)) return flag;
  }
  return flags[0] ?? null;
}
