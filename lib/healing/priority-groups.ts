import {
  HEALING_DEGRADATION_LABELS,
  type HealingDegradationFlag,
} from "@/lib/healing/degradation";
import { compareHealingRows } from "@/lib/healing/queue-priority";
import type { HealingQueueRow } from "@/lib/healing/load-degraded-queue";

/** Restoration workflow sections — what to fix first. */
export type HealingPriorityGroupId =
  | "cover_critical"
  | "high_confidence_match"
  | "duplicate_rvtr"
  | "weak_confidence_join"
  | "orphan_vdj"
  | "other_degraded";

export type HealingPriorityGroup = {
  groupId: HealingPriorityGroupId;
  label: string;
  workflowHint: string;
  rows: HealingQueueRow[];
};

export const HEALING_PRIORITY_ORDER: HealingPriorityGroupId[] = [
  "cover_critical",
  "high_confidence_match",
  "duplicate_rvtr",
  "weak_confidence_join",
  "orphan_vdj",
];

export const HEALING_PRIORITY_META: Record<
  Exclude<HealingPriorityGroupId, "other_degraded">,
  { label: string; workflowHint: string }
> = {
  cover_critical: {
    label: "1 · Cover-Critical",
    workflowHint:
      "Chart + artist integrity, but no cover continuity and no album enrichment — highest public-facing harm.",
  },
  high_confidence_match: {
    label: "2 · High Confidence Album Match",
    workflowHint:
      "Strong deterministic album-link candidates (≥0.45) — safest restoration wins when approved later.",
  },
  duplicate_rvtr: {
    label: "3 · Duplicate Clusters",
    workflowHint:
      "Fragmented RVTR variants — resolve canonical identity before linking or cover work.",
  },
  weak_confidence_join: {
    label: "4 · Weak Joins",
    workflowHint:
      "Linked or candidate joins with weak year/title confidence — verify era and compilation slots.",
  },
  orphan_vdj: {
    label: "5 · Orphan Variants",
    workflowHint:
      "VDJ media without stable graph/album linkage — reconcile library overlay after canonical anchor exists.",
  },
};

export type HealingWorkflowSummary = {
  coverCritical: number;
  missingAlbumLinks: number;
  duplicateClusters: number;
  orphanVariants: number;
  weakJoins: number;
  healthyControls: number;
  highConfidenceInSample: number;
};

export function isHighConfidenceAlbumMatch(row: HealingQueueRow): boolean {
  if (row.coverCritical) return false;
  if (row.topConfidence != null && row.topConfidence >= 0.45) {
    return row.degradationFlags.includes("missing_album_links") || row.albumLinkCount === 0;
  }
  return false;
}

/** Proxy ordering before expand — chart-strong unlinked tracks likely to score well. */
export function highConfidenceProxyRank(row: HealingQueueRow): number {
  if (row.coverCritical) return 0;
  if (!row.degradationFlags.includes("missing_album_links") && row.albumLinkCount > 0) {
    return 0;
  }
  return row.chartWeeks;
}

export function buildWorkflowSummary(
  counts: Record<HealingDegradationFlag, number>,
  healthyControlCount: number,
  sampleRows: HealingQueueRow[],
): HealingWorkflowSummary {
  return {
    coverCritical: counts.cover_critical,
    missingAlbumLinks: counts.missing_album_links,
    duplicateClusters: counts.duplicate_rvtr,
    orphanVariants: counts.orphan_vdj,
    weakJoins: counts.weak_confidence_join,
    healthyControls: healthyControlCount,
    highConfidenceInSample: sampleRows.filter(isHighConfidenceAlbumMatch).length,
  };
}

export function buildPriorityGroups(rows: HealingQueueRow[]): HealingPriorityGroup[] {
  const used = new Set<string>();
  const groups: HealingPriorityGroup[] = [];

  function take(predicate: (r: HealingQueueRow) => boolean): HealingQueueRow[] {
    const picked = rows
      .filter((r) => !used.has(r.rvtr) && predicate(r))
      .sort((a, b) => compareHealingRows(a, b));
    for (const r of picked) used.add(r.rvtr);
    return picked;
  }

  const coverCritical = take((r) => r.coverCritical || r.degradationFlags.includes("cover_critical"));
  if (coverCritical.length > 0) {
    groups.push({ groupId: "cover_critical", ...HEALING_PRIORITY_META.cover_critical, rows: coverCritical });
  }

  const highConf = take((r) => isHighConfidenceAlbumMatch(r));
  if (highConf.length > 0) {
    groups.push({
      groupId: "high_confidence_match",
      ...HEALING_PRIORITY_META.high_confidence_match,
      rows: highConf,
    });
  } else {
    const proxy = take(
      (r) =>
        !r.coverCritical &&
        r.degradationFlags.includes("missing_album_links") &&
        highConfidenceProxyRank(r) >= 12,
    );
    if (proxy.length > 0) {
      groups.push({
        groupId: "high_confidence_match",
        label: HEALING_PRIORITY_META.high_confidence_match.label,
        workflowHint: `${HEALING_PRIORITY_META.high_confidence_match.workflowHint} (expand rows to load confidence — chart-ranked proxy).`,
        rows: proxy.slice(0, 10),
      });
    }
  }

  const duplicates = take((r) => r.degradationFlags.includes("duplicate_rvtr"));
  if (duplicates.length > 0) {
    groups.push({ groupId: "duplicate_rvtr", ...HEALING_PRIORITY_META.duplicate_rvtr, rows: duplicates });
  }

  const weakJoins = take((r) => r.degradationFlags.includes("weak_confidence_join"));
  if (weakJoins.length > 0) {
    groups.push({
      groupId: "weak_confidence_join",
      ...HEALING_PRIORITY_META.weak_confidence_join,
      rows: weakJoins,
    });
  }

  const orphans = take((r) => r.degradationFlags.includes("orphan_vdj"));
  if (orphans.length > 0) {
    groups.push({ groupId: "orphan_vdj", ...HEALING_PRIORITY_META.orphan_vdj, rows: orphans });
  }

  const remainder = rows.filter((r) => !used.has(r.rvtr)).sort((a, b) => compareHealingRows(a, b));
  if (remainder.length > 0) {
    groups.push({
      groupId: "other_degraded",
      label: "6 · Other degraded",
      workflowHint: `Remaining sample tracks — ${HEALING_DEGRADATION_LABELS.missing_cover} / ${HEALING_DEGRADATION_LABELS.missing_album_links} backlog.`,
      rows: remainder,
    });
  }

  return groups;
}
