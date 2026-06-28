import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

import { paletteFromDna } from "./derived-visual";
import type { PerformanceFrame, VisualStyleDefinition } from "./types";

function lightingEmphasis(dna: CollectorSongDna | null): string[] {
  const visual = dna?.visual;
  const lines: string[] = [];
  if (visual?.lightingStyle) {
    lines.push(`${visual.lightingStyle.replace(/_/g, " ")} lighting`);
  }
  if (visual?.stageAtmosphere) {
    lines.push(`${visual.stageAtmosphere.replace(/_/g, " ")} atmosphere`);
  }
  if (visual?.brightness) {
    lines.push(`${visual.brightness} overall brightness`);
  }
  if (dna?.experience.overallMood) {
    lines.push(`${dna.experience.overallMood} mood`);
  }
  return lines.slice(0, 4);
}

function musicalEmphasis(dna: CollectorSongDna | null): string[] {
  if (!dna?.musical) return [];
  const m = dna.musical;
  return [
    m.energy.label ? `${m.energy.label.toLowerCase()} energy` : null,
    m.valence.label ? `${m.valence.label.toLowerCase()} valence` : null,
    m.danceability.label ? `${m.danceability.label.toLowerCase()} danceability` : null,
    m.acousticness.label ? `${m.acousticness.label.toLowerCase()} acousticness` : null,
    m.tempo.label ? `tempo ${m.tempo.label}` : null,
  ].filter(Boolean) as string[];
}

function artDirectionEmphasis(profile: ArtDirectionProfile | null): string[] {
  if (!profile) return [];
  return [
    profile.colorSystem.background.label,
    profile.composition.framingStyle.label,
    profile.composition.whiteSpace.label,
    profile.motion.profile.label,
  ].filter(Boolean);
}

export function buildDerivedVisualPrompt(input: {
  frame: PerformanceFrame;
  style: VisualStyleDefinition;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile | null;
  songTitle: string;
  artist: string;
}): string {
  const { frame, style, songDna, artDirection, songTitle, artist } = input;
  const lighting = lightingEmphasis(songDna);
  const musical = musicalEmphasis(songDna);
  const direction = artDirectionEmphasis(artDirection);
  const palette = paletteFromDna(songDna);

  const lines = [
    `Transform this performance frame into a ${style.name.toLowerCase()}.`,
    "",
    `Song: "${songTitle}" by ${artist}.`,
    frame.caption ? `Frame context: ${frame.caption}.` : null,
    "",
    "Preserve",
    "• performer identity",
    "• stage lighting",
    "• composition",
    "",
    "Emphasize",
    ...lighting.map((l) => `• ${l}`),
    ...musical.slice(0, 3).map((m) => `• ${m}`),
    ...direction.slice(0, 2).map((d) => `• ${d}`),
    ...(palette.length ? [`• palette hints: ${palette.join(", ")}`] : []),
    "",
    "Do not change pose.",
    "Do not invent instruments.",
    "Do not crop performer.",
    "Do not add text or logos.",
    "",
    `Style notes: ${style.description}`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

export function buildDerivedVisualTitle(
  style: VisualStyleDefinition,
  songTitle: string,
): string {
  return `${songTitle} — ${style.name}`;
}

export function buildDerivedVisualDescription(
  style: VisualStyleDefinition,
  frame: PerformanceFrame,
): string {
  return `Derived ${style.name.toLowerCase()} from performance frame ${frame.id}${frame.caption ? ` (${frame.caption})` : ""}. Preview metadata only — no generated image yet.`;
}
