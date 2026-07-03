/**
 * Step 1 — Story Discovery: find meaningful stories in the Retrograph.
 */

import type { Retrograph, RetrographFact } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";

import { discoveryIdsForStory } from "./build-opportunities";
import type { DirectorExperienceOpportunity, DirectorStory } from "./types";

type StoryTemplate = {
  id: string;
  title: string;
  hook: string;
  whyCare: string;
  minFacts?: number;
  match: (ctx: StoryMatchContext) => { eligible: boolean; factIds: string[]; reason?: string };
};

type StoryMatchContext = {
  retrograph: Retrograph;
  facts: RetrographFact[];
  factById: Map<string, RetrographFact>;
};

function factsMatching(
  facts: RetrographFact[],
  opts: { categories?: string[]; keywords?: RegExp[] },
): RetrographFact[] {
  return facts.filter((f) => {
    if (opts.categories?.length && !opts.categories.includes(f.category)) return false;
    if (opts.keywords?.length && !opts.keywords.some((re) => re.test(f.text))) return false;
    return true;
  });
}

const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: "hero",
    title: "Rise of the Song",
    hook: "Every great song has a moment the world first heard it.",
    whyCare: "Introduce the song identity — who, what, when.",
    match: ({ retrograph }) => ({
      eligible: Boolean(retrograph.song.title && retrograph.song.artist),
      factIds: [],
    }),
  },
  {
    id: "introduction",
    title: "Story Introduction",
    hook: "Before the details — why this song matters.",
    whyCare: "Frame the documentary before diving into chapters.",
    match: () => ({ eligible: true, factIds: [] }),
  },
  {
    id: "recording_story",
    title: "Recording Story",
    hook: "Some songs are born in legendary rooms with unlikely pitches.",
    whyCare: "The studio, the songwriter, and the session that created the track.",
    minFacts: 1,
    match: ({ facts }) => {
      const matched = factsMatching(facts, {
        categories: ["recording", "cultural_impact"],
        keywords: [/muscle shoals/i, /studio/i, /written by/i, /producer/i, /recorded at/i, /pitch/i],
      });
      const fromNotes = retrographRecordingNotes(facts);
      const ids = [...new Set([...matched, ...fromNotes].map((f) => f.id))];
      return {
        eligible: ids.length >= 1,
        factIds: ids,
        reason: ids.length === 0 ? "No recording session facts or studio notes" : undefined,
      };
    },
  },
  {
    id: "album_story",
    title: "Album Story",
    hook: "A hit single lives inside a larger album world.",
    whyCare: "Place the song on its album and release context.",
    match: ({ retrograph, facts }) => {
      const albumFacts = factsMatching(facts, { categories: ["album"] });
      const eligible = Boolean(retrograph.album.title || retrograph.album.recordings.length > 0);
      return {
        eligible,
        factIds: albumFacts.map((f) => f.id),
        reason: eligible ? undefined : "No album entity in Retrograph",
      };
    },
  },
  {
    id: "chart_journey",
    title: "Chart Journey",
    hook: "The climb, the peak, and how long America kept listening.",
    whyCare: "Chart success is the most tangible proof a song broke through.",
    match: ({ retrograph, facts }) => {
      const chartFacts = factsMatching(facts, { categories: ["chart"] });
      const eligible = retrograph.charts.peakHot100 != null;
      return {
        eligible,
        factIds: chartFacts.map((f) => f.id),
        reason: eligible ? undefined : "No chart peak in Retrograph",
      };
    },
  },
  {
    id: "artist_journey",
    title: "Artist Journey",
    hook: "Dr. Hook didn't arrive overnight — this song fits a career arc.",
    whyCare: "Connect the song to the artist's identity and trajectory.",
    minFacts: 1,
    match: ({ retrograph, facts }) => {
      const artistFacts = factsMatching(facts, {
        categories: ["artist", "cultural_impact"],
        keywords: [/band/i, /dr\.?\s*hook/i, /country rock/i, /seventh album/i],
      });
      const eligible = artistFacts.length >= 1 || retrograph.artist.relatedArtists.length > 1;
      return {
        eligible,
        factIds: artistFacts.map((f) => f.id),
        reason: eligible ? undefined : "Insufficient artist career material",
      };
    },
  },
  {
    id: "performance_history",
    title: "Performance History",
    hook: "The camera found this song again — on stage and on screen.",
    whyCare: "Visual performance history brings the song to life.",
    match: ({ retrograph }) => {
      const eligible = retrograph.performances.length > 0 || retrograph.media.videos.length > 0;
      return {
        eligible,
        factIds: [],
        reason: eligible ? undefined : "No performance or video in Retrograph",
      };
    },
  },
  {
    id: "song_dna",
    title: "Song DNA",
    hook: "Every song has a fingerprint — tempo, key, and emotional color.",
    whyCare: "Musical identity as a visual story beat.",
    match: () => ({ eligible: true, factIds: [] }),
  },
  {
    id: "cultural_impact",
    title: "Cultural Impact",
    hook: "Some songs become bigger than the charts.",
    whyCare: "International reach, cultural footprint, and lasting resonance.",
    minFacts: 1,
    match: ({ facts }) => {
      const matched = factsMatching(facts, {
        categories: ["cultural_impact"],
        keywords: [/uk/i, /canada/i, /australia/i, /international/i, /top 10/i],
      });
      return {
        eligible: matched.length >= 1,
        factIds: matched.map((f) => f.id),
        reason: matched.length === 0 ? "No cultural impact facts beyond basics" : undefined,
      };
    },
  },
  {
    id: "legacy",
    title: "Legacy",
    hook: "What remains after the charts fade.",
    whyCare: "Timeline events and lasting significance.",
    match: ({ retrograph, facts }) => {
      const legacyFacts = factsMatching(facts, { keywords: [/legacy/i, /gold/i, /certified/i] });
      const eligible = retrograph.timeline.length >= 3 || legacyFacts.length >= 1;
      return {
        eligible,
        factIds: legacyFacts.map((f) => f.id),
        reason: eligible ? undefined : "Timeline too thin for legacy chapter",
      };
    },
  },
  {
    id: "related_songs",
    title: "Related Songs",
    hook: "One song opens doors to others.",
    whyCare: "Discovery paths through the Retroverse graph.",
    match: ({ retrograph }) => ({
      eligible: retrograph.relatedSongs.length > 0,
      factIds: [],
      reason: retrograph.relatedSongs.length === 0 ? "No related songs in Retrograph" : undefined,
    }),
  },
];

function retrographRecordingNotes(facts: RetrographFact[]): RetrographFact[] {
  return facts.filter((f) => /recorded at|written by|studio|producer|muscle shoals/i.test(f.text));
}

export function discoverStories(
  retrograph: Retrograph,
  options?: {
    opportunities?: DirectorExperienceOpportunity[];
    hasSongDna?: boolean;
  },
): DirectorStory[] {
  const facts = usableRetrographFacts(retrograph);
  const factById = new Map(facts.map((f) => [f.id, f]));
  const ctx: StoryMatchContext = { retrograph, facts, factById };

  const mediaIds = retrograph.media.images.map((i) => i.assetId);
  const relationshipIds = retrograph.relationships.map((r) => r.id);

  return STORY_TEMPLATES.map((template) => {
    const { eligible, factIds, reason } = template.match(ctx);

    let storyMediaIds: string[] = [];
    if (template.id === "hero" || template.id === "album_story") {
      storyMediaIds = retrograph.media.images
        .filter((i) => i.category === "cover")
        .map((i) => i.assetId);
    } else if (template.id === "performance_history") {
      storyMediaIds = retrograph.media.images
        .filter((i) => i.performanceId)
        .map((i) => i.assetId);
    } else if (template.id === "chart_journey") {
      storyMediaIds = retrograph.media.images
        .filter((i) => i.category === "Hero" || i.category === "Performance")
        .slice(0, 1)
        .map((i) => i.assetId);
    }

    let storyRels = relationshipIds;
    if (template.id === "chart_journey") {
      storyRels = retrograph.relationships
        .filter((r) => r.kind.includes("chart"))
        .map((r) => r.id);
    } else if (template.id === "performance_history") {
      storyRels = retrograph.relationships
        .filter((r) => r.kind.includes("performance"))
        .map((r) => r.id);
    } else if (template.id === "artist_journey") {
      storyRels = retrograph.relationships
        .filter((r) => r.kind.includes("artist"))
        .map((r) => r.id);
    }

    const linkedDiscoveryIds = options?.opportunities
      ? discoveryIdsForStory(template.id, options.opportunities)
      : [];

    let eligibleFinal = eligible;
    let skipReasonFinal = eligible ? null : (reason ?? "Insufficient material");

    if (options?.opportunities) {
      const enabledByDiscovery =
        linkedDiscoveryIds.length > 0 ||
        (template.id === "hero") ||
        (template.id === "introduction") ||
        (template.id === "song_dna" && options.hasSongDna);

      if (!enabledByDiscovery) {
        eligibleFinal = false;
        skipReasonFinal = "No interesting discovery drives this story";
      }
    }

    const status = eligibleFinal ? "discovered" : "skipped";

    return {
      id: template.id,
      title: template.title,
      hook: template.hook,
      whyCare: template.whyCare,
      status,
      skipReason: eligibleFinal ? null : (skipReasonFinal ?? "Insufficient material"),
      factIds,
      mediaIds: storyMediaIds,
      relationshipIds: storyRels,
      exhibitIds: [],
      pageIds: [],
      discoveryIds: linkedDiscoveryIds,
    };
  });
}
