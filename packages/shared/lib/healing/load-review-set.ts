import {
  HEALING_HEALTHY_CONTROL_RVTR,
  loadStandByMeClusterRvtrs,
} from "@/lib/healing/clusters/stand-by-me";
import { detectTrackHealingGaps } from "@/lib/track/album-link-recovery/detect-gaps";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { loadMissingLinkSummary } from "@/lib/track/album-link-recovery/audit-missing-links";
import type {
  HealingClusterId,
  HealingReviewItem,
  HealingReviewSet,
} from "@/lib/healing/types";

const CLUSTER_LABELS: Record<HealingClusterId, string> = {
  stand_by_me: "Stand By Me · missing album links",
  degraded_sample: "Degraded Hot 100 sample",
};

async function rvtrsForCluster(clusterId: HealingClusterId): Promise<string[]> {
  if (clusterId === "stand_by_me") {
    return loadStandByMeClusterRvtrs(20);
  }
  const { sampleMissingLinkRvtrs } = await import(
    "@/lib/track/album-link-recovery/audit-missing-links"
  );
  return sampleMissingLinkRvtrs(15);
}

function toReviewItem(
  audit: NonNullable<Awaited<ReturnType<typeof auditTrackAlbumLinks>>>,
  coverGap: boolean,
): HealingReviewItem {
  return {
    ...audit,
    reviewStatus: audit.existingLinkCount > 0 ? "applied" : "open",
    topConfidence: audit.candidates[0]?.confidence ?? null,
    coverGap,
  };
}

export async function loadHealingReviewSet(
  clusterId: HealingClusterId = "stand_by_me",
): Promise<HealingReviewSet> {
  const summary = await loadMissingLinkSummary();
  const hot100Total = summary?.hot100Total ?? 0;
  const hot100MissingLinks = summary?.hot100MissingLinks ?? 0;

  const controlAudit = await auditTrackAlbumLinks(HEALING_HEALTHY_CONTROL_RVTR);
  const rvtrs = await rvtrsForCluster(clusterId);

  const items: HealingReviewItem[] = [];
  for (const rvtr of rvtrs) {
    const gaps = await detectTrackHealingGaps(rvtr);
    const audit = await auditTrackAlbumLinks(rvtr);
    if (!audit) continue;
    items.push(toReviewItem(audit, gaps?.missingCover ?? true));
  }

  const degradedCount = items.filter((i) => i.gap === "missing_album_links").length;

  return {
    clusterId,
    clusterLabel: CLUSTER_LABELS[clusterId],
    generatedAt: new Date().toISOString(),
    summary: {
      hot100Total,
      hot100MissingLinks,
      pctMissing:
        hot100Total > 0
          ? Math.round((hot100MissingLinks / hot100Total) * 1000) / 10
          : 0,
      clusterSize: items.length,
      degradedCount,
    },
    healthyControl: controlAudit,
    items,
  };
}
