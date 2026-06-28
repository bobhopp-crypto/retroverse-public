/**
 * Sprint 3.34 — Discoveries → experience opportunities → narrative chapters.
 */

import type {
  DirectorExperienceOpportunity,
  DirectorInterestingDiscovery,
  DirectorNarrativeChapter,
} from "./types";

const DISCOVERY_TO_STORY: Record<string, string[]> = {
  uk_number_one_surprise: ["chart_journey", "cultural_impact"],
  bathroom_pitch: ["recording_story", "introduction"],
  muscle_shoals_session: ["recording_story"],
  chart_longevity: ["chart_journey"],
  belated_international_hit: ["chart_journey", "cultural_impact"],
  seventh_album_turning_point: ["album_story", "artist_journey"],
  performance_footage: ["performance_history"],
  gold_certification: ["legacy"],
  songwriter_even_stevens: ["recording_story"],
  producer_ron_haffkine: ["recording_story"],
  dual_album_pressing: ["album_story"],
};

const STRUCTURAL = ["hero", "introduction", "song_dna"];

export function buildExperienceOpportunities(
  discoveries: DirectorInterestingDiscovery[],
): DirectorExperienceOpportunity[] {
  const out: DirectorExperienceOpportunity[] = [];

  for (const d of discoveries) {
    if (d.category === "missing_research") continue;
    const storyIds = DISCOVERY_TO_STORY[d.id] ?? ["cultural_impact"];
    for (const storyId of storyIds) {
      out.push({
        id: `opp-${d.id}-${storyId}`,
        title: `${d.title} → ${storyId.replace(/_/g, " ")}`,
        discoveryId: d.id,
        storyId,
        exhibitHints: d.potentialExperiences,
        priority: d.rank,
        compositeScore: d.scores.composite,
      });
    }
  }

  for (const storyId of STRUCTURAL) {
    out.push({
      id: `opp-structural-${storyId}`,
      title: `Structural — ${storyId.replace(/_/g, " ")}`,
      discoveryId: "",
      storyId,
      exhibitHints: [],
      priority: storyId === "hero" ? 0 : storyId === "introduction" ? 1 : 50,
      compositeScore: 100,
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

export function buildNarrativeChapters(
  discoveries: DirectorInterestingDiscovery[],
  opportunities: DirectorExperienceOpportunity[],
): DirectorNarrativeChapter[] {
  const usedIds = new Set(opportunities.filter((o) => o.discoveryId).map((o) => o.discoveryId));

  const pick = (pred: (d: DirectorInterestingDiscovery) => boolean) =>
    discoveries.filter((d) => usedIds.has(d.id) && pred(d)).map((d) => d.id);

  return [
    {
      id: "life_of_the_song",
      title: "The Life of the Song",
      thesis: "How the track was written, recorded, released, and climbed the charts.",
      discoveryIds: pick((d) =>
        ["recording_story", "album_story", "chart_journey", "legacy", "artist_journey"].some((s) =>
          opportunities.some((o) => o.discoveryId === d.id && o.storyId === s),
        ),
      ),
      storyIds: ["hero", "introduction", "recording_story", "album_story", "chart_journey", "artist_journey", "legacy"],
      opportunityIds: opportunities.filter((o) =>
        ["hero", "introduction", "recording_story", "album_story", "chart_journey", "artist_journey", "legacy"].includes(
          o.storyId,
        ),
      ).map((o) => o.id),
      order: 1,
    },
    {
      id: "watching_the_song",
      title: "Watching the Song",
      thesis: "Performance footage, video, and the song's musical fingerprint.",
      discoveryIds: pick((d) =>
        opportunities.some(
          (o) => o.discoveryId === d.id && (o.storyId === "performance_history" || o.storyId === "song_dna"),
        ),
      ),
      storyIds: ["performance_history", "song_dna"],
      opportunityIds: opportunities
        .filter((o) => ["performance_history", "song_dna"].includes(o.storyId))
        .map((o) => o.id),
      order: 2,
    },
    {
      id: "crossing_borders",
      title: "Crossing Borders",
      thesis: "How a US hit grew into an international success.",
      discoveryIds: pick(
        (d) =>
          d.category === "unexpected_chart_success" ||
          d.category === "cultural_influence" ||
          opportunities.some((o) => o.discoveryId === d.id && o.storyId === "cultural_impact"),
      ),
      storyIds: ["cultural_impact", "chart_journey"],
      opportunityIds: opportunities.filter((o) => o.storyId === "cultural_impact").map((o) => o.id),
      order: 3,
    },
  ];
}

export function discoveryIdsForStory(storyId: string, opportunities: DirectorExperienceOpportunity[]): string[] {
  return [...new Set(opportunities.filter((o) => o.storyId === storyId && o.discoveryId).map((o) => o.discoveryId))];
}

export function minDiscoveryRankForStory(
  storyId: string,
  opportunities: DirectorExperienceOpportunity[],
  discoveries: DirectorInterestingDiscovery[],
): number {
  const ids = discoveryIdsForStory(storyId, opportunities);
  if (!ids.length) {
    if (storyId === "hero") return 0;
    if (storyId === "introduction") return 1;
    return 500;
  }
  return Math.min(...ids.map((id) => discoveries.find((d) => d.id === id)?.rank ?? 500));
}
