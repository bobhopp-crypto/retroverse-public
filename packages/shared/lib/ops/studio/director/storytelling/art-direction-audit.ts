/**
 * Sprint 3.36 — Art direction consistency audit + overview.
 */

import { resolveEraProfile } from "./era-styling";
import type {
  DirectorArtDirectionBrief,
  DirectorArtDirectionConsistency,
  DirectorArtDirectionOverview,
  DirectorStoryboardBeat,
} from "./types";

function countRepeats(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k} (×${n})`);
}

export function buildArtDirectionConsistency(
  briefs: DirectorArtDirectionBrief[],
): DirectorArtDirectionConsistency {
  const repeatedPalettes = countRepeats(
    briefs.flatMap((b) => [b.colorPalette.sort().join("+")]),
  );
  const repeatedLayouts = countRepeats(briefs.map((b) => b.layoutStyle));
  const repeatedCameras = countRepeats(briefs.map((b) => b.camera));
  const repeatedTextures = countRepeats(briefs.flatMap((b) => b.textures));
  const repeatedMotions = countRepeats(briefs.map((b) => b.motion));
  const repeatedTones = countRepeats(briefs.map((b) => b.emotionalTone));

  const uniqueIdentities = new Set(briefs.map((b) => b.visualIdentity)).size;
  const uniquenessScore = Math.min(
    100,
    Math.round(
      (uniqueIdentities / Math.max(1, briefs.length)) * 40 +
        (repeatedCameras.length === 0 ? 15 : 5) +
        (repeatedLayouts.length === 0 ? 15 : 5) +
        (repeatedMotions.length === 0 ? 15 : 5) +
        (repeatedPalettes.length === 0 ? 15 : 5),
    ),
  );

  return {
    uniquenessScore,
    repeatedPalettes,
    repeatedLayouts,
    repeatedCameras,
    repeatedTextures,
    repeatedMotions,
    repeatedEmotionalTones: repeatedTones,
    warnings: [
      ...repeatedCameras.map((r) => `Repeated camera: ${r}`),
      ...repeatedLayouts.map((r) => `Repeated layout: ${r}`),
      ...repeatedMotions.map((r) => `Repeated motion: ${r}`),
      ...repeatedPalettes.map((r) => `Repeated palette: ${r}`),
    ],
  };
}

export function buildArtDirectionOverview(
  briefs: DirectorArtDirectionBrief[],
  consistency: DirectorArtDirectionConsistency,
  storyboard: DirectorStoryboardBeat[],
  songYear: number | null | undefined,
): DirectorArtDirectionOverview {
  const era = resolveEraProfile(songYear);
  const visualStyles = [...new Set(briefs.map((b) => b.visualIdentity))];
  const cameras = [...new Set(briefs.map((b) => b.camera))];
  const motions = [...new Set(briefs.map((b) => b.motion))];
  const textures = [...new Set(briefs.flatMap((b) => b.textures))];
  const allColors = [...new Set(briefs.flatMap((b) => b.colorPalette))];
  const tones = briefs.map((b) => b.emotionalTone);

  const pacing = storyboard
    .flatMap((beat) => {
      const brief = briefs.find((b) => b.storyId === beat.storyId);
      return brief ? [brief.emotionalTone] : [];
    })
    .join(" → ");

  const identityParts = [
    era.decade,
    era.graphicTrends[0],
    visualStyles[0]?.split(" ")[0],
  ].filter(Boolean);

  return {
    visualStylesUsed: visualStyles,
    cameraVariety: cameras,
    motionVariety: motions,
    eraAuthenticity: `${era.year} — ${era.authenticityNote}`,
    textureBalance: textures,
    colorDiversity: allColors,
    emotionalPacing: pacing || tones.join(" → "),
    overallCreativeIdentity: `${identityParts.join(" · ")} documentary experience`,
    consistencyScore: consistency.uniquenessScore,
  };
}
