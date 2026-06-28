import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

import type { SongDnaArtDirection, SongDnaVisualConcept, SongDnaChapter } from "./types";

export function buildSongDnaArtDirection(dna: CollectorSongDna): SongDnaArtDirection {
  const v = dna.visual;
  return {
    visualIdentity: `Song DNA · ${dna.experience.overallMood}`,
    colorField: v?.dominantPalette ?? ["#090B09", "#784429"],
    lighting: v?.lightingStyle?.replace(/_/g, " ") ?? "warm stage",
    texture: v?.visualTexture ?? "grain",
    typography: v?.typographyStyle ?? "editorial",
    motionStyle: dna.experience.recommendedMotionStyle,
    museumExhibitStyle: "Scientific music lab — interactive museum panel",
    openingBeat: `The exhibit opens on a glowing DNA spiral. ${dna.experience.suggestedOpeningStyle}. Colors from the album artwork pulse through the space.`,
    closingBeat: `${dna.experience.suggestedEndingStyle}. The fingerprint settles — you understand why this song feels ${dna.experience.overallMood.split("·")[0]?.trim()}.`,
  };
}

export function buildVisualConcepts(chapters: SongDnaChapter[], dna: CollectorSongDna): SongDnaVisualConcept[] {
  const palette = dna.visual?.dominantPalette ?? ["#1a7a7a", "#784429"];
  return chapters.map((chapter) => ({
    chapterId: chapter.id,
    title: chapter.title,
    description: chapter.visualConcept,
    layout: layoutForChapter(chapter.id),
    motion: chapter.motionConcept,
    palette: palette.slice(0, 4),
    heroElement: heroForChapter(chapter.id),
  }));
}

function layoutForChapter(id: SongDnaChapter["id"]): string {
  const map: Record<SongDnaChapter["id"], string> = {
    identity: "DNA fingerprint hero",
    energy: "Waveform arena",
    rhythm: "Pulse ring stage",
    harmony: "Color field canvas",
    instrumentation: "Orbital layer diagram",
    vocals: "Vocal ribbon stream",
    production: "Studio depth panel",
    similarities: "Constellation wall",
    legacy: "Museum closing plaque",
  };
  return map[id];
}

function heroForChapter(id: SongDnaChapter["id"]): string {
  const map: Record<SongDnaChapter["id"], string> = {
    identity: "Animated DNA spiral",
    energy: "Energy particle field",
    rhythm: "Tempo pulse rings",
    harmony: "Key color bloom",
    instrumentation: "Orbiting instrument nodes",
    vocals: "Vocal wave ribbon",
    production: "Studio texture morph",
    similarities: "Neighbor constellation",
    legacy: "Influence ripple",
  };
  return map[id];
}

export function buildPreviewWall(
  concepts: SongDnaVisualConcept[],
  dna: CollectorSongDna,
): import("./types").SongDnaPreviewCard[] {
  return concepts.map((concept, index) => ({
    chapterId: concept.chapterId,
    title: concept.title,
    mood: dna.experience.overallMood,
    layout: concept.layout,
    palette: concept.palette,
    motion: concept.motion.replace(/_/g, " "),
    priority: index === 0 ? "hero" : index === concepts.length - 1 ? "closing" : "supporting",
  }));
}

export function buildAudienceSequence(chapters: SongDnaChapter[]): import("./types").SongDnaAudienceBeat[] {
  return chapters.map((chapter, index) => ({
    order: index + 1,
    chapterId: chapter.id,
    title: chapter.title,
    emotionalGoal: chapter.audienceBeat,
    pacing: pacingForChapter(chapter.id),
    dwellSeconds: dwellForChapter(chapter.id),
  }));
}

function pacingForChapter(id: SongDnaChapter["id"]): "slow" | "medium" | "fast" {
  if (id === "identity" || id === "legacy" || id === "production") return "slow";
  if (id === "rhythm" || id === "energy") return "fast";
  return "medium";
}

function dwellForChapter(id: SongDnaChapter["id"]): number {
  if (id === "identity") return 12;
  if (id === "legacy") return 10;
  if (id === "similarities") return 8;
  return 7;
}
