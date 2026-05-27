import type { HealingReviewSet } from "@/lib/healing/types";
import type { TrackAlbumLinkAudit } from "@/lib/track/album-link-recovery/types";
import { formatTrackAudit } from "@/lib/track/album-link-recovery/format-report";

export function formatHealingReviewSet(review: HealingReviewSet): string {
  const header = [
    "# Healing review set (preview only)",
    "",
    `Cluster: ${review.clusterLabel} (${review.clusterId})`,
    `Generated: ${review.generatedAt}`,
    `Hot 100: ${review.summary.hot100Total.toLocaleString()} · missing links: ${review.summary.hot100MissingLinks.toLocaleString()} (${review.summary.pctMissing}%)`,
    `Cluster size: ${review.summary.clusterSize} · degraded: ${review.summary.degradedCount}`,
    "",
    "> No writes. Approve in /ops/healing or POST /api/ops/healing/apply with RETROVERSE_HEALING_APPLY=1.",
    "",
  ];

  const control = review.healthyControl
    ? `## Healthy control\n\n${formatTrackAudit(review.healthyControl)}\n`
    : "";

  const degraded = review.items.filter((i) => i.gap === "missing_album_links");
  const linked = review.items.filter((i) => i.gap !== "missing_album_links");

  const bodyDegraded =
    degraded.length > 0
      ? `## Degraded (${degraded.length})\n\n${degraded.map((i) => formatReviewItem(i)).join("\n\n---\n\n")}\n`
      : "";

  const bodyLinked =
    linked.length > 0
      ? `## Linked / contrast (${linked.length})\n\n${linked.map((i) => formatReviewItem(i)).join("\n\n---\n\n")}\n`
      : "";

  return `${header.join("\n")}\n${control}\n---\n\n${bodyDegraded}\n---\n\n${bodyLinked}`;
}

function formatReviewItem(item: TrackAlbumLinkAudit & { coverGap?: boolean }): string {
  const extra =
    item.coverGap === false
      ? "\n- cover: linked album has canonical cover"
      : "\n- cover: missing (album link or canonical_cover_path)";
  return `${formatTrackAudit(item)}${extra}`;
}
