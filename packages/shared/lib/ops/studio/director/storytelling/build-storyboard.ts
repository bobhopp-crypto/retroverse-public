/**
 * Step 5 — Storyboard: documentary ordering weighted by discovery rank.
 */

import { minDiscoveryRankForStory } from "./build-opportunities";
import type {
  DirectorExperienceOpportunity,
  DirectorInterestingDiscovery,
  DirectorStory,
  DirectorStoryPage,
  DirectorStoryboardBeat,
} from "./types";

const ROLE_BY_STORY: Record<string, DirectorStoryboardBeat["role"]> = {
  hero: "opening",
  introduction: "opening",
  recording_story: "act",
  album_story: "act",
  chart_journey: "act",
  artist_journey: "act",
  performance_history: "act",
  song_dna: "visual_break",
  cultural_impact: "act",
  legacy: "closing",
  related_songs: "closing",
};

export function buildStoryboard(
  stories: DirectorStory[],
  pages: DirectorStoryPage[],
  options?: {
    discoveries?: DirectorInterestingDiscovery[];
    opportunities?: DirectorExperienceOpportunity[];
  },
): DirectorStoryboardBeat[] {
  const builtStories = stories.filter((s) => s.status === "built");
  const storyById = new Map(builtStories.map((s) => [s.id, s]));

  const orderedStoryIds = builtStories
    .map((s) => s.id)
    .sort((a, b) => {
      if (!options?.discoveries || !options?.opportunities) {
        return defaultOrder(a) - defaultOrder(b);
      }
      const rankA = minDiscoveryRankForStory(a, options.opportunities, options.discoveries);
      const rankB = minDiscoveryRankForStory(b, options.opportunities, options.discoveries);
      if (rankA !== rankB) return rankA - rankB;
      return defaultOrder(a) - defaultOrder(b);
    });

  const beats: DirectorStoryboardBeat[] = [];
  let order = 1;

  for (const storyId of orderedStoryIds) {
    const story = storyById.get(storyId);
    if (!story || story.pageIds.length === 0) continue;

    const storyPages = pages.filter((p) => story.pageIds.includes(p.id));
    const exhibitIds = [...new Set(storyPages.map((p) => p.exhibitId))];

    beats.push({
      order: order++,
      storyId: story.id,
      storyTitle: story.title,
      role: ROLE_BY_STORY[story.id] ?? "act",
      exhibitIds,
      pageIds: storyPages.map((p) => p.id),
    });
  }

  return beats;
}

function defaultOrder(storyId: string): number {
  const order = [
    "hero",
    "introduction",
    "recording_story",
    "album_story",
    "chart_journey",
    "artist_journey",
    "performance_history",
    "song_dna",
    "cultural_impact",
    "legacy",
    "related_songs",
  ];
  return order.indexOf(storyId);
}
