/**
 * Coverage Report — maximize story coverage, not page count.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";

import { mapFactsToStories } from "./build-clusters";
import type {
  DirectorCoverageReport,
  DirectorExhibit,
  DirectorStory,
  DirectorStoryPage,
} from "./types";

export function buildCoverageReport(
  retrograph: Retrograph,
  stories: DirectorStory[],
  exhibits: DirectorExhibit[],
  pages: DirectorStoryPage[],
): DirectorCoverageReport {
  const allFacts = usableRetrographFacts(retrograph);
  const usedFactIds = new Set(pages.flatMap((p) => p.factIds));
  const unusedFactIds = allFacts
    .filter((f) => !usedFactIds.has(f.id))
    .map((f) => f.id);

  const allMedia = retrograph.media.images.map((i) => i.assetId);
  const usedMediaIds = new Set(pages.flatMap((p) => p.mediaIds));
  const unusedMediaIds = allMedia.filter((id) => !usedMediaIds.has(id));

  const allRels = retrograph.relationships.map((r) => r.id);
  const usedRels = new Set(exhibits.flatMap((e) => e.relationshipIds));

  const factStoryMap = mapFactsToStories(retrograph, stories);
  const factsWithoutStory = allFacts.filter((f) => !factStoryMap.has(f.id)).map((f) => f.id);

  const skippedStories = stories
    .filter((s) => s.status === "skipped")
    .map((s) => ({ id: s.id, title: s.title, reason: s.skipReason ?? "Unknown" }));

  const unusedStories = stories
    .filter((s) => s.status === "discovered")
    .map((s) => ({ id: s.id, title: s.title, reason: "Discovered but no exhibits built" }));

  const missingResearchOpportunities = [
    ...retrograph.unknowns,
    factsWithoutStory.length > 0 ? `${factsWithoutStory.length} facts not assigned to any story` : null,
    unusedMediaIds.length > 0 ? `${unusedMediaIds.length} media assets unused in storyboard` : null,
    retrograph.pendingFacts.length > 0
      ? `${retrograph.pendingFacts.length} pending facts awaiting Editor promotion`
      : null,
  ].filter(Boolean) as string[];

  return {
    storiesDiscovered: stories.filter((s) => s.status !== "skipped" || s.skipReason).length,
    storiesBuilt: stories.filter((s) => s.status === "built").length,
    storiesSkipped: stories.filter((s) => s.status === "skipped").length,
    exhibitsBuilt: exhibits.filter((e) => e.status === "built").length,
    pagesBuilt: pages.length,
    factsTotal: allFacts.length,
    factsUsed: usedFactIds.size,
    factsUnused: unusedFactIds.length,
    unusedFactIds,
    relationshipsTotal: allRels.length,
    relationshipsUsed: usedRels.size,
    mediaTotal: allMedia.length,
    mediaUsed: usedMediaIds.size,
    unusedMediaIds,
    skippedStories,
    unusedStories,
    missingResearchOpportunities,
  };
}
