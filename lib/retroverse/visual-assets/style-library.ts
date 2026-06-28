import type { LabLayoutId } from "@/lib/retroverse/experience-lab/types";

import type { VisualStyleDefinition, VisualStyleId } from "./types";

const LAYOUTS = {
  magazine: "magazine" as LabLayoutId,
  documentary: "documentary" as LabLayoutId,
  performance: "performance" as LabLayoutId,
  collector: "collector" as LabLayoutId,
  timeline: "timeline" as LabLayoutId,
  minimal: "minimal" as LabLayoutId,
};

function style(
  id: VisualStyleId,
  name: string,
  description: string,
  opts: {
    moods: string[];
    genres: string[];
    decades: string[];
    layouts: LabLayoutId[];
    sceneTypes: string[];
    affinities: string[];
  },
): VisualStyleDefinition {
  return {
    id,
    name,
    description,
    preferredMoods: opts.moods,
    preferredGenres: opts.genres,
    preferredDecades: opts.decades,
    preferredLayouts: opts.layouts,
    preferredSceneTypes: opts.sceneTypes,
    dnaAffinities: opts.affinities,
  };
}

export const VISUAL_STYLE_LIBRARY: VisualStyleDefinition[] = [
  style("charcoal_sketch", "Charcoal Sketch", "Dramatic graphite strokes with deep shadow and isolation.", {
    moods: ["dark", "reflective", "dramatic", "isolation"],
    genres: ["rock", "alternative", "singer-songwriter"],
    decades: ["1970s", "1980s", "1990s"],
    layouts: [LAYOUTS.documentary, LAYOUTS.minimal],
    sceneTypes: ["hero_moment", "final_reflection", "did_you_know"],
    affinities: ["low_energy", "dark_valence", "high_acousticness", "slow_tempo"],
  }),
  style("colored_pencil", "Colored Pencil", "Hand-rendered pencil texture with warm paper grain.", {
    moods: ["warm", "intimate", "nostalgic"],
    genres: ["folk", "indie", "soft rock"],
    decades: ["1960s", "1970s", "1980s"],
    layouts: [LAYOUTS.magazine, LAYOUTS.collector],
    sceneTypes: ["behind_the_song", "legacy_moment"],
    affinities: ["medium_energy", "high_acousticness", "balanced_valence"],
  }),
  style("magazine_illustration", "Magazine Illustration", "Editorial illustration with bold shapes and print texture.", {
    moods: ["editorial", "breakthrough", "cultural"],
    genres: ["pop", "rock", "new wave"],
    decades: ["1970s", "1980s", "1990s"],
    layouts: [LAYOUTS.magazine, LAYOUTS.timeline],
    sceneTypes: ["hero_moment", "chart_milestone", "timeline_beat"],
    affinities: ["medium_energy", "magazine_layout", "cultural_mood"],
  }),
  style("concert_poster", "Concert Poster", "Screen-printed gig poster energy with oversized typography zones.", {
    moods: ["triumph", "performance", "electric"],
    genres: ["rock", "metal", "punk", "electronic"],
    decades: ["1970s", "1980s", "1990s", "2000s"],
    layouts: [LAYOUTS.performance, LAYOUTS.collector],
    sceneTypes: ["performance_spotlight", "hero_moment"],
    affinities: ["high_energy", "high_liveness", "performance_mood"],
  }),
  style("blueprint", "Blueprint", "Technical draft lines on deep blue with measured precision.", {
    moods: ["innovation", "studio", "craft"],
    genres: ["electronic", "progressive", "art rock"],
    decades: ["1970s", "1980s", "2010s"],
    layouts: [LAYOUTS.documentary, LAYOUTS.timeline],
    sceneTypes: ["behind_the_song", "timeline_beat"],
    affinities: ["instrumental", "studio_texture", "moderate_tempo"],
  }),
  style("halftone_print", "Halftone Print", "Newsprint dot texture with punchy contrast.", {
    moods: ["chart", "breakthrough", "kinetic"],
    genres: ["pop", "dance", "rock"],
    decades: ["1960s", "1970s", "1980s", "1990s"],
    layouts: [LAYOUTS.magazine, LAYOUTS.collector],
    sceneTypes: ["chart_milestone", "did_you_know"],
    affinities: ["high_energy", "high_danceability", "brisk_pace"],
  }),
  style("airbrush_1980s", "1980s Airbrush", "Soft gradient airbrush glow with MTV-era atmosphere.", {
    moods: ["television", "breakthrough", "synth"],
    genres: ["pop", "synth-pop", "soft rock"],
    decades: ["1980s"],
    layouts: [LAYOUTS.performance, LAYOUTS.magazine],
    sceneTypes: ["hero_moment", "performance_spotlight"],
    affinities: ["1980s_era", "television_lighting", "medium_energy"],
  }),
  style("neon_poster", "Neon Poster", "Electric neon edges on dark stage backgrounds.", {
    moods: ["triumph", "dance", "nightlife"],
    genres: ["dance", "electronic", "pop"],
    decades: ["1980s", "1990s", "2000s", "2010s"],
    layouts: [LAYOUTS.performance, LAYOUTS.minimal],
    sceneTypes: ["performance_spotlight", "visual_break"],
    affinities: ["high_energy", "high_danceability", "electronic", "bright_valence"],
  }),
  style("watercolor", "Watercolor", "Soft washes and bleeding pigment with emotional warmth.", {
    moods: ["reflective", "gentle", "melancholy"],
    genres: ["folk", "acoustic", "singer-songwriter"],
    decades: ["1960s", "1970s", "1990s"],
    layouts: [LAYOUTS.minimal, LAYOUTS.magazine],
    sceneTypes: ["final_reflection", "legacy_moment", "did_you_know"],
    affinities: ["low_energy", "high_acousticness", "leisurely_pace", "reflective_mood"],
  }),
  style("television_scanline", "Television Scanline", "Broadcast CRT texture with scan lines and glow.", {
    moods: ["television", "breakthrough", "broadcast"],
    genres: ["pop", "rock", "television"],
    decades: ["1970s", "1980s", "1990s"],
    layouts: [LAYOUTS.documentary, LAYOUTS.performance],
    sceneTypes: ["hero_moment", "timeline_beat"],
    affinities: ["television_lighting", "broadcast_stage", "1980s_era"],
  }),
  style("screen_print", "Screen Print", "Limited-ink poster layers with tactile registration offsets.", {
    moods: ["collectible", "underground", "live"],
    genres: ["punk", "indie", "alternative"],
    decades: ["1970s", "1980s", "1990s"],
    layouts: [LAYOUTS.collector, LAYOUTS.performance],
    sceneTypes: ["performance_spotlight", "legacy_moment"],
    affinities: ["high_liveness", "performance_driven", "medium_energy"],
  }),
  style("minimal_ink", "Minimal Ink", "Single-weight ink lines with maximum negative space.", {
    moods: ["minimal", "still", "focused"],
    genres: ["acoustic", "ambient", "minimal pop"],
    decades: ["1990s", "2000s", "2010s"],
    layouts: [LAYOUTS.minimal],
    sceneTypes: ["pause_moment", "visual_break", "big_quote"],
    affinities: ["low_energy", "minimal_typography", "still_camera"],
  }),
  style("graphic_novel", "Graphic Novel", "Panel-ready ink with cinematic shadow blocks.", {
    moods: ["dramatic", "narrative", "performance-driven"],
    genres: ["rock", "alternative", "hip-hop"],
    decades: ["1980s", "1990s", "2000s"],
    layouts: [LAYOUTS.documentary, LAYOUTS.collector],
    sceneTypes: ["behind_the_song", "hero_moment", "performance_spotlight"],
    affinities: ["medium_energy", "story_driven", "cinematic_typography"],
  }),
  style("vintage_editorial", "Vintage Editorial", "Aged magazine stock with halftone and serif captions.", {
    moods: ["editorial", "heritage", "chart success"],
    genres: ["rock", "pop", "soul"],
    decades: ["1960s", "1970s", "1980s"],
    layouts: [LAYOUTS.magazine, LAYOUTS.timeline],
    sceneTypes: ["chart_milestone", "timeline_beat", "legacy_moment"],
    affinities: ["magazine_layout", "historical_importance", "medium_energy"],
  }),
  style("album_jacket", "Album Jacket Illustration", "Sleeve-art composition with label-circle framing.", {
    moods: ["collectible", "iconic", "album"],
    genres: ["rock", "pop", "soul", "electronic"],
    decades: ["1960s", "1970s", "1980s", "1990s"],
    layouts: [LAYOUTS.collector, LAYOUTS.magazine],
    sceneTypes: ["hero_moment", "legacy_moment"],
    affinities: ["cultural_importance", "collector_layout", "dominant_palette"],
  }),
  style("monochrome_blue", "Monochrome Blue", "Single-hue blue study echoing concert lighting.", {
    moods: ["concert", "cool", "stage"],
    genres: ["rock", "alternative", "electronic"],
    decades: ["1980s", "1990s", "2000s"],
    layouts: [LAYOUTS.performance, LAYOUTS.documentary],
    sceneTypes: ["performance_spotlight", "visual_break"],
    affinities: ["concert_blue", "dark_brightness", "stage_smoke"],
  }),
  style("pastel_illustration", "Pastel Illustration", "Soft pastel planes with playful collectible energy.", {
    moods: ["bright", "triumph", "playful"],
    genres: ["pop", "dance", "disco"],
    decades: ["1970s", "1980s", "1990s", "2000s"],
    layouts: [LAYOUTS.magazine, LAYOUTS.collector],
    sceneTypes: ["hero_moment", "chart_milestone"],
    affinities: ["bright_valence", "high_danceability", "high_energy"],
  }),
];

export const VISUAL_STYLE_BY_ID: Record<VisualStyleId, VisualStyleDefinition> = Object.fromEntries(
  VISUAL_STYLE_LIBRARY.map((s) => [s.id, s]),
);

export function getVisualStyle(id: VisualStyleId): VisualStyleDefinition | undefined {
  return VISUAL_STYLE_BY_ID[id];
}

export function defaultVisualStyle(): VisualStyleDefinition {
  return VISUAL_STYLE_LIBRARY[0]!;
}
