/**
 * Sprint 3.34 — Discovery coverage audit.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";

import type {
  DirectorDiscoveryCoverage,
  DirectorInterestingDiscovery,
  DirectorStory,
  DirectorStoryPage,
} from "./types";

export function buildDiscoveryCoverage(
  retrograph: Retrograph,
  discoveries: DirectorInterestingDiscovery[],
  stories: DirectorStory[],
  pages: DirectorStoryPage[],
): DirectorDiscoveryCoverage {
  const usedDiscoveryIds = new Set(
    stories.filter((s) => s.status === "built").flatMap((s) => s.discoveryIds),
  );

  const allFacts = usableRetrographFacts(retrograph);
  const usedFactIds = new Set(pages.flatMap((p) => p.factIds));
  const allMedia = retrograph.media.images.map((i) => i.assetId);
  const usedMedia = new Set(pages.flatMap((p) => p.mediaIds));
  const allRels = retrograph.relationships.map((r) => r.id);
  const usedRels = new Set(stories.flatMap((s) => s.relationshipIds));

  const ignored = discoveries
    .filter((d) => !usedDiscoveryIds.has(d.id))
    .map((d) => ({
      id: d.id,
      title: d.title,
      reason:
        d.category === "missing_research"
          ? "Research gap — recommend Collector follow-up"
          : "Discovery ranked but no built story chapter used it",
    }));

  return {
    discoveriesFound: discoveries.length,
    discoveriesUsed: usedDiscoveryIds.size,
    discoveriesIgnored: discoveries.length - usedDiscoveryIds.size,
    ignored,
    unusedFactIds: allFacts.filter((f) => !usedFactIds.has(f.id)).map((f) => f.id),
    unusedMediaIds: allMedia.filter((id) => !usedMedia.has(id)),
    unusedRelationshipIds: allRels.filter((id) => !usedRels.has(id)),
  };
}

export function markDiscoveryUsage(
  discoveries: DirectorInterestingDiscovery[],
  coverage: DirectorDiscoveryCoverage,
): DirectorInterestingDiscovery[] {
  const ignoredIds = new Set(coverage.ignored.map((i) => i.id));
  return discoveries.map((d) => ({
    ...d,
    status: ignoredIds.has(d.id) ? "ignored" : "used",
    ignoreReason: ignoredIds.has(d.id)
      ? coverage.ignored.find((i) => i.id === d.id)?.reason ?? null
      : null,
  }));
}
