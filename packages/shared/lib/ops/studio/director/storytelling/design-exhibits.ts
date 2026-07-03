/**
 * Step 3 — Design Exhibits: break each story into museum/documentary exhibits.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import type { DirectorExhibit, DirectorStory, DirectorStoryCluster } from "./types";

type ExhibitTemplate = {
  id: string;
  title: string;
  purpose: string;
  filterFacts?: (text: string) => boolean;
  mediaCategories?: string[];
};

const EXHIBITS_BY_STORY: Record<string, ExhibitTemplate[]> = {
  hero: [
    { id: "identity", title: "Song Identity", purpose: "Who, what, when — the opening title card" },
  ],
  introduction: [
    { id: "opening_hook", title: "Why This Song", purpose: "Documentary cold open — why care" },
  ],
  recording_story: [
    {
      id: "recording_session",
      title: "Recording Session",
      purpose: "How the track was captured",
      filterFacts: (t) => /recorded|session|studio|muscle shoals/i.test(t),
    },
    {
      id: "studio",
      title: "The Studio",
      purpose: "Where the magic happened",
      filterFacts: (t) => /muscle shoals|alabama|studio/i.test(t),
    },
    {
      id: "songwriter",
      title: "The Songwriter",
      purpose: "Who wrote it and how it arrived",
      filterFacts: (t) => /written by|even stevens|pitch|bathroom/i.test(t),
    },
    {
      id: "producer",
      title: "The Producer",
      purpose: "Who shaped the sound",
      filterFacts: (t) => /producer|haffkine|ron/i.test(t),
    },
  ],
  album_story: [
    {
      id: "album_context",
      title: "The Album",
      purpose: "Album title, year, and placement on the record",
      filterFacts: (t) => /album|pleasure/i.test(t),
    },
    {
      id: "track_context",
      title: "On the Track Listing",
      purpose: "Where this song sits on the album",
    },
  ],
  chart_journey: [
    {
      id: "peak_moment",
      title: "Peak Moment",
      purpose: "The highest chart position",
      filterFacts: (t) => /#6|peak|hot 100/i.test(t),
    },
    {
      id: "chart_longevity",
      title: "Chart Longevity",
      purpose: "Weeks on chart and staying power",
      filterFacts: (t) => /weeks|25/i.test(t),
    },
    {
      id: "international",
      title: "International Charts",
      purpose: "Success beyond the US",
      filterFacts: (t) => /uk|canada|australia|international|number one/i.test(t),
    },
  ],
  artist_journey: [
    {
      id: "the_band",
      title: "The Band",
      purpose: "Who Dr. Hook was at this moment",
      filterFacts: (t) => /dr\.?\s*hook|band|country rock/i.test(t),
    },
    {
      id: "career_context",
      title: "Career Context",
      purpose: "Album number and career positioning",
      filterFacts: (t) => /seventh album|pleasure/i.test(t),
    },
  ],
  performance_history: [
    {
      id: "official_video",
      title: "Official Video",
      purpose: "Primary music video capture",
      mediaCategories: ["Hero", "Performance"],
    },
    {
      id: "live_moments",
      title: "Live Moments",
      purpose: "Stage and crowd energy",
      mediaCategories: ["Crowd", "Close-up", "Alternate"],
    },
    {
      id: "video_gallery",
      title: "Video Gallery",
      purpose: "Additional frames from owned footage",
      mediaCategories: ["Alternate", "Close-up", "Crowd", "Performance"],
    },
  ],
  song_dna: [{ id: "musical_fingerprint", title: "Musical Fingerprint", purpose: "Tempo, key, energy visualization" }],
  cultural_impact: [
    {
      id: "cultural_footprint",
      title: "Cultural Footprint",
      purpose: "Why the song mattered beyond numbers",
      filterFacts: (t) => /top 10|sharing the night|international/i.test(t),
    },
  ],
  legacy: [
    {
      id: "timeline_legacy",
      title: "Timeline Legacy",
      purpose: "Key dates that define the song's history",
    },
    {
      id: "lasting_significance",
      title: "Lasting Significance",
      purpose: "What endures after the charts",
      filterFacts: (t) => /gold|certified|legacy/i.test(t),
    },
  ],
  related_songs: [{ id: "discovery_paths", title: "Discovery Paths", purpose: "Related songs in the Retroverse graph" }],
};

function pickMedia(
  retrograph: Retrograph,
  categories: string[] | undefined,
  clusterMediaIds: string[],
): string[] {
  if (!categories?.length) return clusterMediaIds.slice(0, 2);
  const fromCat = retrograph.media.images
    .filter((i) => categories.some((c) => i.category.toLowerCase().includes(c.toLowerCase())))
    .map((i) => i.assetId);
  return [...new Set([...fromCat, ...clusterMediaIds])].slice(0, 4);
}

export function designExhibits(
  retrograph: Retrograph,
  stories: DirectorStory[],
  clusters: DirectorStoryCluster[],
): DirectorExhibit[] {
  const exhibits: DirectorExhibit[] = [];
  const clusterByStory = new Map(clusters.map((c) => [c.storyId, c]));

  for (const story of stories) {
    if (story.status === "skipped") continue;

    const cluster = clusterByStory.get(story.id);
    const templates = EXHIBITS_BY_STORY[story.id] ?? [];
    const storyExhibitIds: string[] = [];

    for (const template of templates) {
      const exhibitId = `${story.id}:${template.id}`;
      const clusterFacts = cluster?.factIds ?? story.factIds;
      const factTexts = clusterFacts
        .map((fid) => {
          const f =
            retrograph.facts.find((x) => x.id === fid) ??
            retrograph.pendingFacts.find((x) => x.id === fid);
          return f?.text ?? "";
        })
        .filter(Boolean);

      const exhibitFactIds = template.filterFacts
        ? clusterFacts.filter((fid) => {
            const f =
              retrograph.facts.find((x) => x.id === fid) ??
              retrograph.pendingFacts.find((x) => x.id === fid);
            return f && template.filterFacts!(f.text);
          })
        : clusterFacts.slice(0, 3);

      const mediaIds = pickMedia(retrograph, template.mediaCategories, cluster?.mediaIds ?? story.mediaIds);

      const hasContent =
        exhibitFactIds.length > 0 ||
        mediaIds.length > 0 ||
        story.id === "hero" ||
        story.id === "introduction" ||
        story.id === "song_dna" ||
        (story.id === "chart_journey" && retrograph.charts.peakHot100 != null) ||
        (story.id === "album_story" && retrograph.album.title);

      if (!hasContent) {
        exhibits.push({
          id: exhibitId,
          storyId: story.id,
          title: template.title,
          purpose: template.purpose,
          factIds: [],
          mediaIds: [],
          relationshipIds: [],
          estimatedPages: 0,
          pageIds: [],
          status: "skipped",
          skipReason: "No facts or media for this exhibit",
        });
        continue;
      }

      const estimatedPages = Math.min(
        3,
        Math.max(1, exhibitFactIds.length || (mediaIds.length > 0 ? 1 : 0)),
      );

      exhibits.push({
        id: exhibitId,
        storyId: story.id,
        title: template.title,
        purpose: template.purpose,
        factIds: exhibitFactIds,
        mediaIds,
        relationshipIds: cluster?.relationshipIds ?? story.relationshipIds,
        estimatedPages,
        pageIds: [],
        status: "built",
        skipReason: null,
      });
      storyExhibitIds.push(exhibitId);
    }

    story.exhibitIds = storyExhibitIds.filter((id) =>
      exhibits.some((e) => e.id === id && e.status === "built"),
    );
    if (story.exhibitIds.length > 0) {
      story.status = "built";
    } else if (story.status === "discovered") {
      story.status = "skipped";
      story.skipReason = "No exhibits could be built from available material";
    }
  }

  return exhibits;
}
