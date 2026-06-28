/**
 * Sprint 3.36 — Art Director: define how every experience should LOOK.
 * Creative direction only — never generates artwork or AI prompts.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import { resolveEraProfile } from "./era-styling";
import {
  CAMERA_ICONS,
  MOTION_ICONS,
} from "./visual-language-library";
import type {
  DirectorArtDirectionBrief,
  DirectorExperienceConcept,
  DirectorInterestingDiscovery,
  DirectorPageArtDirection,
  DirectorStory,
  DirectorVisualConcept,
} from "./types";

type ArtBlueprint = Omit<
  DirectorArtDirectionBrief,
  "id" | "storyId" | "storyTitle" | "eraYear" | "eraNotes" | "openingBeat"
>;

const STORY_ART: Record<string, ArtBlueprint> = {
  hero: {
    visualIdentity: "Album premiere poster",
    primaryEnvironment: "Record store window display",
    camera: "Push-in",
    lighting: "Golden hour",
    colorPalette: ["Cream", "Amber", "Brown", "Teal"],
    textures: ["Gloss magazine", "Vinyl"],
    motion: "Zoom",
    layoutStyle: "Poster",
    primaryFocus: "Album cover artwork",
    supportingElements: ["Artist name", "Release year", "Title lockup"],
    emotionalGoal: "Recognition — the world meets this song",
    emotionalTone: "Wonder",
  },
  introduction: {
    visualIdentity: "Documentary cold open",
    primaryEnvironment: "Editorial title card",
    camera: "Close-up",
    lighting: "Studio tungsten",
    colorPalette: ["Cream", "Muted black", "Sepia"],
    textures: ["Paper", "Film grain"],
    motion: "Fade",
    layoutStyle: "Magazine",
    primaryFocus: "Pull-quote typography",
    supportingElements: ["Soft vignette", "Discovery tease line"],
    emotionalGoal: "Lean in — why this song matters",
    emotionalTone: "Curiosity",
  },
  recording_story: {
    visualIdentity: "1978 recording studio",
    primaryEnvironment: "Muscle Shoals hallway",
    camera: "Tracking",
    lighting: "Studio tungsten",
    colorPalette: ["Amber", "Brown", "Cream", "Muted black"],
    textures: ["Film grain", "Paper", "Tape"],
    motion: "Slow pan",
    layoutStyle: "Film storyboard",
    primaryFocus: "Bathroom door",
    supportingElements: ["Studio clock", "Coffee cup", "Handwritten lyric sheet"],
    emotionalGoal: "This almost never happened.",
    emotionalTone: "Suspense",
  },
  album_story: {
    visualIdentity: "Collector's desk",
    primaryEnvironment: "Wood writing desk with turntable",
    camera: "Overhead",
    lighting: "Daylight",
    colorPalette: ["Wood tone", "Cream", "Brown", "Gold"],
    textures: ["Wood", "Vinyl", "Paper"],
    motion: "Record spin",
    layoutStyle: "Record sleeve",
    primaryFocus: "Album sleeve face-up",
    supportingElements: ["Record label", "Catalog number", "Track list"],
    emotionalGoal: "Nostalgia — holding the physical record",
    emotionalTone: "Reflection",
  },
  chart_journey: {
    visualIdentity: "Billboard office",
    primaryEnvironment: "Chart room wall",
    camera: "Static",
    lighting: "Daylight",
    colorPalette: ["White", "Red", "Black"],
    textures: ["Newsprint", "Gloss magazine"],
    motion: "Timeline growth",
    layoutStyle: "Billboard",
    primaryFocus: "Animated chart line",
    supportingElements: ["Magazine covers", "Chart pages", "Peak badge"],
    emotionalGoal: "Momentum — feel the climb",
    emotionalTone: "Excitement",
  },
  artist_journey: {
    visualIdentity: "Band documentary archive",
    primaryEnvironment: "Photo contact sheet wall",
    camera: "Wide",
    lighting: "Museum",
    colorPalette: ["Sepia", "Cream", "Muted black"],
    textures: ["Film grain", "Polaroid"],
    motion: "Cross dissolve",
    layoutStyle: "Scrapbook",
    primaryFocus: "Era-spanning band photos",
    supportingElements: ["Career milestone captions", "Timeline dots"],
    emotionalGoal: "Context — where this song sits in a life",
    emotionalTone: "Reflection",
  },
  performance_history: {
    visualIdentity: "Concert memory wall",
    primaryEnvironment: "Backstage photo collage",
    camera: "Handheld",
    lighting: "Concert spotlight",
    colorPalette: ["Stage blue", "Spotlight white", "Black"],
    textures: ["Polaroid", "CRT"],
    motion: "Photo scatter",
    layoutStyle: "Concert flyer",
    primaryFocus: "Performance stills",
    supportingElements: ["Venue names", "Dates", "Crowd silhouettes"],
    emotionalGoal: "Energy — you were there",
    emotionalTone: "Celebration",
  },
  song_dna: {
    visualIdentity: "Scientific music lab",
    primaryEnvironment: "Analysis workstation",
    camera: "Close-up",
    lighting: "Neon",
    colorPalette: ["Lab cyan", "Muted black", "White"],
    textures: ["Blueprint"],
    motion: "Pulse",
    layoutStyle: "Infographic",
    primaryFocus: "DNA spiral visualization",
    supportingElements: ["Tempo", "Key", "Energy", "Waveform"],
    emotionalGoal: "Discovery — see the song's shape",
    emotionalTone: "Wonder",
  },
  cultural_impact: {
    visualIdentity: "International magazine spread",
    primaryEnvironment: "Editorial map desk",
    camera: "Overhead",
    lighting: "Daylight",
    colorPalette: ["Cream", "Teal", "Gold", "Navy"],
    textures: ["Gloss magazine", "Newsprint"],
    motion: "Map travel",
    layoutStyle: "Magazine",
    primaryFocus: "Stylized world map with chart pins",
    supportingElements: ["Country flags", "UK #1 badge", "International chart stats"],
    emotionalGoal: "Scale — this song traveled",
    emotionalTone: "Triumph",
  },
  legacy: {
    visualIdentity: "Museum timeline",
    primaryEnvironment: "Gallery wall installation",
    camera: "Pull-back",
    lighting: "Museum",
    colorPalette: ["Museum gray", "Gold", "Cream", "Brown"],
    textures: ["Wood", "Paper"],
    motion: "Timeline growth",
    layoutStyle: "Museum panel",
    primaryFocus: "Horizontal decade timeline",
    supportingElements: ["Gold certification", "Awards", "Later influence"],
    emotionalGoal: "Reflection — what remains",
    emotionalTone: "Hope",
  },
};

const EXHIBIT_ART_OVERRIDES: Record<
  string,
  Partial<Pick<DirectorPageArtDirection, "cameraLabel" | "motionLabel" | "layoutType" | "texture"> & {
    paletteChips?: string[];
  }>
> = {
  "chart_journey:peak_moment": {
    paletteChips: ["White", "Red", "Black"],
    cameraLabel: "Static",
    motionLabel: "Timeline growth",
    layoutType: "Billboard",
    texture: "Newsprint",
  },
  "chart_journey:international": {
    paletteChips: ["Cream", "Teal", "Gold"],
    cameraLabel: "Overhead",
    motionLabel: "Map travel",
    layoutType: "Magazine",
    texture: "Gloss magazine",
  },
  "performance_history:official_video": {
    paletteChips: ["Stage blue", "Spotlight white", "Black"],
    cameraLabel: "Close-up",
    motionLabel: "Cross dissolve",
    layoutType: "TV guide",
    texture: "CRT",
  },
  "performance_history:live_moments": {
    paletteChips: ["Black", "Red", "Spotlight white"],
    cameraLabel: "Handheld",
    motionLabel: "Photo scatter",
    layoutType: "Concert flyer",
    texture: "Polaroid",
  },
};

function openingBeat(
  brief: ArtBlueprint,
  story: DirectorStory,
  discoveries: DirectorInterestingDiscovery[],
  era: ReturnType<typeof resolveEraProfile>,
): string {
  const top = discoveries
    .filter((d) => story.discoveryIds.includes(d.id))
    .sort((a, b) => a.rank - b.rank)[0];

  if (story.id === "recording_story" && top?.id === "bathroom_pitch") {
    return (
      `It opens with a dimly lit Muscle Shoals hallway. Warm tungsten lighting. ` +
      `Camera follows a producer walking away while handwritten lyrics fade in on cream paper.`
    );
  }
  if (story.id === "chart_journey") {
    return (
      `Straight-on view of a ${era.decade} Billboard chart wall. Red line climbs week by week ` +
      `against newsprint texture. Peak #6 holds in bold type.`
    );
  }
  if (story.id === "hero") {
    return (
      `Album cover fills the frame on cream paper. Slow push-in as ${era.decade} display type ` +
      `locks the title over the artwork.`
    );
  }
  return (
    `${brief.visualIdentity} — ${brief.primaryEnvironment}. ${brief.lighting} light, ` +
    `${brief.camera.toLowerCase()} camera, ${brief.motion.toLowerCase()} motion.`
  );
}

function applyEraToBrief(brief: ArtBlueprint, era: ReturnType<typeof resolveEraProfile>): ArtBlueprint {
  const palette =
    brief.colorPalette.length >= 3
      ? brief.colorPalette
      : [...new Set([...brief.colorPalette, ...era.defaultPalette])].slice(0, 5);

  return {
    ...brief,
    colorPalette: palette,
    textures: [...new Set([...brief.textures, era.materials[0] ?? "Paper"])].slice(0, 4),
  };
}

const usedCameras = new Set<string>();
const usedLayouts = new Set<string>();
const usedMotions = new Set<string>();

function pickUnique(
  preferred: string,
  pool: readonly string[],
  used: Set<string>,
): string {
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  for (const item of pool) {
    if (!used.has(item)) {
      used.add(item);
      return item;
    }
  }
  used.add(preferred);
  return preferred;
}

export function designArtDirectionBriefs(
  experienceConcepts: DirectorExperienceConcept[],
  stories: DirectorStory[],
  discoveries: DirectorInterestingDiscovery[],
  retrograph: Retrograph,
): DirectorArtDirectionBrief[] {
  usedCameras.clear();
  usedLayouts.clear();
  usedMotions.clear();

  const era = resolveEraProfile(retrograph.song.year);
  const out: DirectorArtDirectionBrief[] = [];

  for (const concept of experienceConcepts) {
    const story = stories.find((s) => s.id === concept.storyId);
    if (!story || story.status === "skipped") continue;

    const base = STORY_ART[concept.storyId];
    if (!base) continue;

    const brief = applyEraToBrief(base, era);
    const camera = pickUnique(brief.camera, [
      "Static", "Push-in", "Tracking", "Overhead", "Handheld", "Close-up", "Wide", "Pull-back",
    ], usedCameras);
    const layoutStyle = pickUnique(brief.layoutStyle, [
      "Magazine", "Poster", "Museum panel", "Billboard", "Record sleeve", "Film storyboard",
      "Infographic", "Concert flyer", "Scrapbook", "TV guide",
    ], usedLayouts);
    const motion = pickUnique(brief.motion, [
      "Slow pan", "Zoom", "Fade", "Timeline growth", "Map travel", "Photo scatter",
      "Record spin", "Pulse", "Cross dissolve",
    ], usedMotions);

    out.push({
      id: `art-${concept.storyId}`,
      storyId: concept.storyId,
      storyTitle: concept.storyTitle,
      ...brief,
      camera,
      layoutStyle,
      motion,
      eraYear: era.year,
      eraNotes: `${era.decade} — ${era.authenticityNote}. Typography: ${era.typography.slice(0, 2).join(", ")}.`,
      openingBeat: openingBeat({ ...brief, camera, layoutStyle, motion }, story, discoveries, era),
    });
  }

  return out;
}

export function designPageArtDirections(
  briefs: DirectorArtDirectionBrief[],
  visualConcepts: DirectorVisualConcept[],
  experienceConcepts: DirectorExperienceConcept[],
): DirectorPageArtDirection[] {
  const briefByStory = new Map(briefs.map((b) => [b.storyId, b]));
  const expByStory = new Map(experienceConcepts.map((c) => [c.storyId, c]));

  return visualConcepts.map((vc) => {
    const brief = briefByStory.get(vc.storyId);
    const exp = expByStory.get(vc.storyId);
    const override = EXHIBIT_ART_OVERRIDES[vc.exhibitId];

    const paletteChips = override?.paletteChips ?? brief?.colorPalette ?? ["Cream", "Teal"];
    const cameraLabel = override?.cameraLabel ?? brief?.camera ?? "Static";
    const motionLabel = override?.motionLabel ?? brief?.motion ?? "Fade";
    const layoutType = override?.layoutType ?? brief?.layoutStyle ?? "Magazine";
    const texture = override?.texture ?? brief?.textures[0] ?? "Paper";

    return {
      exhibitId: vc.exhibitId,
      storyId: vc.storyId,
      pageId: null,
      wireframeIcon: vc.wireframeIcon,
      paletteChips,
      cameraIcon: CAMERA_ICONS[cameraLabel] ?? "▣",
      cameraLabel,
      motionIcon: MOTION_ICONS[motionLabel] ?? "◐",
      motionLabel,
      layoutType,
      texture,
      mood: brief?.emotionalTone ?? vc.mood,
      priority: exp?.visualPriority ?? 3,
    };
  });
}

export function attachPageIdsToArtDirections(
  pageArtDirections: DirectorPageArtDirection[],
  pages: Array<{ id: string; exhibitId: string }>,
): DirectorPageArtDirection[] {
  const pageByExhibit = new Map(pages.map((p) => [p.exhibitId, p.id]));
  return pageArtDirections.map((pad) => ({
    ...pad,
    pageId: pageByExhibit.get(pad.exhibitId) ?? null,
  }));
}
