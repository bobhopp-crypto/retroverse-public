/**
 * Step 2 — Story Clusters: group Retrograph material under each story.
 */

import type { Retrograph, RetrographFact } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";

import type { DirectorStory, DirectorStoryCluster } from "./types";

const STORY_FACT_RULES: Record<string, { categories?: string[]; keywords?: RegExp[] }> = {
  recording_story: {
    categories: ["recording", "cultural_impact"],
    keywords: [/muscle shoals/i, /studio/i, /written by/i, /producer/i, /recorded/i, /pitch/i, /even stevens/i],
  },
  album_story: { categories: ["album"], keywords: [/pleasure/i, /album/i] },
  chart_journey: { categories: ["chart"], keywords: [/hot 100/i, /billboard/i, /weeks/i, /peak/i, /uk/i] },
  artist_journey: {
    categories: ["artist", "cultural_impact"],
    keywords: [/dr\.?\s*hook/i, /band/i, /country rock/i, /seventh album/i, /ray sawyer/i],
  },
  cultural_impact: {
    categories: ["cultural_impact"],
    keywords: [/uk/i, /canada/i, /australia/i, /international/i, /top 10/i, /cultural/i],
  },
  legacy: { keywords: [/legacy/i, /gold/i, /certified/i, /timeline/i] },
};

function factMatchesStory(fact: RetrographFact, storyId: string): boolean {
  const rules = STORY_FACT_RULES[storyId];
  if (!rules) return false;
  if (rules.categories?.includes(fact.category)) return true;
  if (rules.keywords?.some((re) => re.test(fact.text))) return true;
  return false;
}

export function buildStoryClusters(
  retrograph: Retrograph,
  stories: DirectorStory[],
): DirectorStoryCluster[] {
  const facts = usableRetrographFacts(retrograph);
  const clusters: DirectorStoryCluster[] = [];

  for (const story of stories) {
    if (story.status === "skipped") continue;

    const clusterFactIds = new Set<string>(story.factIds);
    for (const fact of facts) {
      if (factMatchesStory(fact, story.id)) clusterFactIds.add(fact.id);
    }

    if (story.id === "album_story" && retrograph.album.recordings.length > 0) {
      for (const rec of retrograph.album.recordings) {
        for (const note of rec.notes) {
          const synthetic = facts.find((f) => f.text.includes(note.slice(0, 40)));
          if (synthetic) clusterFactIds.add(synthetic.id);
        }
      }
    }

    if (story.id === "performance_history") {
      for (const perf of retrograph.performances) {
        const perfFacts = facts.filter((f) => f.text.toLowerCase().includes(perf.title.toLowerCase()));
        for (const f of perfFacts) clusterFactIds.add(f.id);
      }
    }

    const factIds = [...clusterFactIds];
    const mediaIds = [...new Set(story.mediaIds)];
    const relationshipIds = [...new Set(story.relationshipIds)];

    const summaryParts = [
      factIds.length ? `${factIds.length} facts` : null,
      mediaIds.length ? `${mediaIds.length} media` : null,
      relationshipIds.length ? `${relationshipIds.length} relationships` : null,
    ].filter(Boolean);

    clusters.push({
      storyId: story.id,
      title: story.title,
      factIds,
      mediaIds,
      relationshipIds,
      summary: summaryParts.join(" · ") || "Identity and context",
    });
  }

  return clusters;
}

/** Facts may belong to multiple stories — returns story IDs per fact. */
export function mapFactsToStories(
  retrograph: Retrograph,
  stories: DirectorStory[],
): Map<string, string[]> {
  const facts = usableRetrographFacts(retrograph);
  const map = new Map<string, string[]>();

  for (const fact of facts) {
    const storyIds: string[] = [];
    for (const story of stories) {
      if (story.status === "skipped") continue;
      if (story.factIds.includes(fact.id) || factMatchesStory(fact, story.id)) {
        storyIds.push(story.id);
      }
    }
    if (storyIds.length) map.set(fact.id, storyIds);
  }

  return map;
}
