/**
 * Sprint 3.35 — Experience Designer: creative direction per story.
 * Answers "How should someone EXPERIENCE this?" — not image prompts.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import type {
  DirectorExperienceConcept,
  DirectorInterestingDiscovery,
  DirectorStory,
  ExperienceType,
} from "./types";

type StoryBlueprint = Omit<
  DirectorExperienceConcept,
  "storyId" | "storyTitle"
> & {
  discoveryBoost?: string[];
};

const STORY_BLUEPRINTS: Record<string, StoryBlueprint> = {
  hero: {
    conceptTitle: "Cinematic Opening",
    experienceType: "cinematic_opening",
    mood: "Grand",
    primaryMedia: "Album cover hero",
    supportingMedia: ["Artist name", "Release year", "Title typography"],
    animation: "Slow zoom into cover art with title reveal",
    narration: "Every great song has a moment the world first heard it.",
    visualPriority: 5,
    visualVocabulary: {
      primaryVisual: "Oversized album artwork",
      supportingVisual: "Bold title lockup",
      backgroundStyle: "Warm cream paper with teal accent frame",
      motionStyle: "Ken Burns drift on cover",
      typographyEmphasis: "Display title — largest element on screen",
      iconography: "Minimal — let artwork dominate",
      informationDensity: "sparse",
      desiredEmotionalReaction: "Recognition and anticipation",
    },
  },
  introduction: {
    conceptTitle: "Documentary Hook",
    experienceType: "documentary",
    mood: "Intimate",
    primaryMedia: "Quote typography",
    supportingMedia: ["Subtle texture", "Discovery tease"],
    animation: "Fade-in from black with voiceover cadence",
    narration: "Before the details — why this song matters.",
    visualPriority: 4,
    visualVocabulary: {
      primaryVisual: "Editorial quote block",
      supportingVisual: "Soft vignette background",
      backgroundStyle: "Paper grain, warm editorial",
      motionStyle: "Gentle fade — no hard cuts",
      typographyEmphasis: "Hook line as pull quote",
      iconography: "None — pure typography moment",
      informationDensity: "sparse",
      desiredEmotionalReaction: "Curiosity — lean in",
    },
    discoveryBoost: ["bathroom_pitch", "uk_number_one_surprise"],
  },
  recording_story: {
    conceptTitle: "Cinematic Reconstruction",
    experienceType: "documentary",
    mood: "Intimate",
    primaryMedia: "Illustration",
    supportingMedia: ["Quote", "Studio photo", "Session personnel"],
    animation: "Slow hallway camera move toward studio door",
    narration: "This hit almost never happened...",
    visualPriority: 5,
    visualVocabulary: {
      primaryVisual: "Illustrated studio scene",
      supportingVisual: "Pull quote from songwriter anecdote",
      backgroundStyle: "Warm sepia studio interior",
      motionStyle: "Slow dolly — documentary opening energy",
      typographyEmphasis: "Anecdote quote in serif pull-quote",
      iconography: "Microphone, studio door, tape reel",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Surprise at the origin story",
    },
    discoveryBoost: ["bathroom_pitch", "muscle_shoals_session", "songwriter_even_stevens"],
  },
  album_story: {
    conceptTitle: "Collector's Record Sleeve",
    experienceType: "record_sleeve",
    mood: "Nostalgic",
    primaryMedia: "Album cover",
    supportingMedia: ["Track list", "Label", "Catalog number"],
    animation: "Record spins onto screen from above",
    narration: "A hit single lives inside a larger album world.",
    visualPriority: 4,
    visualVocabulary: {
      primaryVisual: "Full sleeve artwork",
      supportingVisual: "Vinyl label detail inset",
      backgroundStyle: "Collector shelf — warm wood tone",
      motionStyle: "Spin-in landing on shelf",
      typographyEmphasis: "Album title and year",
      iconography: "Catalog number badge, track list",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Nostalgia — holding the physical record",
    },
    discoveryBoost: ["seventh_album_turning_point", "gold_certification"],
  },
  chart_journey: {
    conceptTitle: "Animated Timeline",
    experienceType: "timeline",
    mood: "Momentum",
    primaryMedia: "Chart animation",
    supportingMedia: ["Magazine covers", "Billboard pages", "Peak badge"],
    animation: "Line climbs week by week toward peak",
    narration: "The climb, the peak, and how long America kept listening.",
    visualPriority: 5,
    visualVocabulary: {
      primaryVisual: "Animated chart line",
      supportingVisual: "Peak position badge",
      backgroundStyle: "Clean data backdrop — cream with chart ink",
      motionStyle: "Line draw — week-by-week momentum",
      typographyEmphasis: "Peak number as hero stat",
      iconography: "Chart arrow, week counter",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Momentum — feel the climb",
    },
    discoveryBoost: ["uk_number_one_surprise", "chart_longevity", "belated_international_hit"],
  },
  artist_journey: {
    conceptTitle: "Career Documentary",
    experienceType: "documentary",
    mood: "Reflective",
    primaryMedia: "Band photo collage",
    supportingMedia: ["Timeline markers", "Career context"],
    animation: "Cross-dissolve between era photos",
    narration: "This song fits a career arc — not an overnight arrival.",
    visualPriority: 3,
    visualVocabulary: {
      primaryVisual: "Era-spanning photo collage",
      supportingVisual: "Career milestone captions",
      backgroundStyle: "Editorial documentary matte",
      motionStyle: "Slow cross-fade between eras",
      typographyEmphasis: "Band name and era labels",
      iconography: "Timeline dots",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Context — where this song sits in a life",
    },
    discoveryBoost: ["seventh_album_turning_point"],
  },
  performance_history: {
    conceptTitle: "Concert Memory Wall",
    experienceType: "performance_reel",
    mood: "Energetic",
    primaryMedia: "Video stills",
    supportingMedia: ["Venue", "Crowd", "Date stamp"],
    animation: "Cross-fade between performances",
    narration: "The camera found this song again — on stage and on screen.",
    visualPriority: 5,
    visualVocabulary: {
      primaryVisual: "Stage stills and video frames",
      supportingVisual: "Venue and date metadata",
      backgroundStyle: "Dark stage wash with spotlight accent",
      motionStyle: "Cross-fade reel between captures",
      typographyEmphasis: "Performance title and year",
      iconography: "Play button, crowd silhouette",
      informationDensity: "sparse",
      desiredEmotionalReaction: "Energy — you were there",
    },
    discoveryBoost: ["performance_footage"],
  },
  song_dna: {
    conceptTitle: "Music Fingerprint",
    experienceType: "data_visualization",
    mood: "Analytical",
    primaryMedia: "DNA visualization",
    supportingMedia: ["Tempo", "Key", "Energy", "Danceability"],
    animation: "Pulse with beat — waveform breathes",
    narration: "Every song has a fingerprint — tempo, key, and emotional color.",
    visualPriority: 4,
    visualVocabulary: {
      primaryVisual: "Radial DNA fingerprint chart",
      supportingVisual: "Tempo and key badges",
      backgroundStyle: "Dark analytical canvas with neon accent",
      motionStyle: "Pulse sync to tempo",
      typographyEmphasis: "Key and BPM as hero stats",
      iconography: "Waveform, key signature",
      informationDensity: "dense",
      desiredEmotionalReaction: "Discovery — see the song's shape",
    },
  },
  cultural_impact: {
    conceptTitle: "World Map Spread",
    experienceType: "map",
    mood: "Expansive",
    primaryMedia: "World map",
    supportingMedia: ["Country flags", "Chart positions abroad", "Magazine spread"],
    animation: "Pins drop on countries as chart facts appear",
    narration: "Some songs become bigger than the charts.",
    visualPriority: 4,
    visualVocabulary: {
      primaryVisual: "Stylized world map with chart pins",
      supportingVisual: "International chart badges",
      backgroundStyle: "Magazine editorial spread — cream and teal",
      motionStyle: "Pin drop animation per territory",
      typographyEmphasis: "Country names and peak positions",
      iconography: "Map pins, flag accents",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Scale — this song traveled",
    },
    discoveryBoost: ["uk_number_one_surprise", "belated_international_hit"],
  },
  legacy: {
    conceptTitle: "Decades Timeline",
    experienceType: "timeline",
    mood: "Reflective",
    primaryMedia: "Timeline",
    supportingMedia: ["Awards", "Certifications", "Later covers"],
    animation: "Decades scroll horizontally",
    narration: "What remains after the charts fade.",
    visualPriority: 4,
    visualVocabulary: {
      primaryVisual: "Horizontal decade timeline",
      supportingVisual: "Award and certification badges",
      backgroundStyle: "Warm reflective gradient — sunset tones",
      motionStyle: "Slow horizontal scroll through decades",
      typographyEmphasis: "Year markers as anchors",
      iconography: "Gold disc, award laurel",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Reflection — lasting significance",
    },
    discoveryBoost: ["gold_certification", "chart_longevity"],
  },
  related_songs: {
    conceptTitle: "Discovery Path",
    experienceType: "collector_card",
    mood: "Playful",
    primaryMedia: "Related track cards",
    supportingMedia: ["Artist graph links", "Album connections"],
    animation: "Cards fan out from center",
    narration: "One song opens doors to others.",
    visualPriority: 2,
    visualVocabulary: {
      primaryVisual: "Collectible card grid",
      supportingVisual: "Graph connection lines",
      backgroundStyle: "Collectible shelf backdrop",
      motionStyle: "Fan-out card reveal",
      typographyEmphasis: "Related song titles",
      iconography: "Link arrows, card frames",
      informationDensity: "moderate",
      desiredEmotionalReaction: "Exploration — keep browsing",
    },
  },
};

function narrationForStory(
  story: DirectorStory,
  discoveries: DirectorInterestingDiscovery[],
  blueprint: StoryBlueprint,
): string {
  const linked = discoveries.filter((d) => story.discoveryIds.includes(d.id));
  const top = linked.sort((a, b) => a.rank - b.rank)[0];
  if (top?.id === "bathroom_pitch") {
    return "This hit almost never happened — conceived in a restroom conversation.";
  }
  if (top?.id === "uk_number_one_surprise") {
    return "#6 in America. #1 in the UK. A year apart.";
  }
  if (top?.id === "performance_footage") {
    return "The camera found this song again — on stage and on screen.";
  }
  return blueprint.narration;
}

function boostPriority(
  story: DirectorStory,
  blueprint: StoryBlueprint,
): number {
  const boost = blueprint.discoveryBoost ?? [];
  const hits = story.discoveryIds.filter((id) => boost.includes(id)).length;
  return Math.min(5, blueprint.visualPriority + hits);
}

export function designExperienceConcepts(
  stories: DirectorStory[],
  discoveries: DirectorInterestingDiscovery[],
  _retrograph: Retrograph,
): DirectorExperienceConcept[] {
  const out: DirectorExperienceConcept[] = [];

  for (const story of stories) {
    if (story.status === "skipped") continue;
    const blueprint = STORY_BLUEPRINTS[story.id];
    if (!blueprint) continue;

    out.push({
      storyId: story.id,
      storyTitle: story.title,
      conceptTitle: blueprint.conceptTitle,
      experienceType: blueprint.experienceType,
      mood: blueprint.mood,
      primaryMedia: blueprint.primaryMedia,
      supportingMedia: blueprint.supportingMedia,
      animation: blueprint.animation,
      narration: narrationForStory(story, discoveries, blueprint),
      visualPriority: boostPriority(story, blueprint),
      visualVocabulary: blueprint.visualVocabulary,
    });
  }

  return out;
}

export function experienceTypeLabel(type: ExperienceType): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
