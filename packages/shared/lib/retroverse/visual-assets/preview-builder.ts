import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { IdentifiedLabel } from "@/lib/ops/studio/model-identity";
import { identifyLabels } from "@/lib/ops/studio/model-identity";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";

import {
  paletteFromDna,
  suggestVisualStyles,
} from "./derived-visual";
import { extractPerformanceFrames, pickPrimaryFrame } from "./frames-from-spec";
import {
  buildDerivedVisualDescription,
  buildDerivedVisualPrompt,
  buildDerivedVisualTitle,
} from "./prompt-builder";
import { VISUAL_STYLE_LIBRARY, getVisualStyle, defaultVisualStyle } from "./style-library";
import type {
  DerivedVisual,
  DerivedVisualPreview,
  DerivedVisualStudioState,
  VisualStyleId,
} from "./types";

function createDerivedVisualRecord(input: {
  rvtr: string;
  frameId: string;
  styleId: VisualStyleId;
  prompt: string;
  palette: string[];
  songDna: CollectorSongDna | null;
  styleName: string;
  title: string;
  description: string;
  preferredSceneTypes: string[];
  preferredLayouts: DerivedVisual["preferredLayouts"];
  preferredMoods: string[];
}): DerivedVisual {
  return {
    id: `dv-${input.rvtr}-${input.frameId}-${input.styleId}`,
    sourceImageId: input.frameId,
    sourceTimestamp: null,
    style: input.styleId,
    title: input.title,
    description: input.description,
    prompt: input.prompt,
    palette: input.palette,
    preferredSceneTypes: input.preferredSceneTypes,
    preferredLayouts: input.preferredLayouts,
    preferredMoods: input.preferredMoods,
    generationStatus: "preview_only",
    previewOnly: true,
  };
}

export function buildDerivedVisualPreview(input: {
  rvtr: string;
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile | null;
  selectedStyleId?: VisualStyleId;
  frameId?: string;
}): DerivedVisualPreview {
  const { rvtr, experience, songDna, artDirection } = input;
  const { spec } = experience;
  const allFrames = extractPerformanceFrames(experience);
  const frame =
    allFrames.find((f) => f.id === input.frameId) ??
    pickPrimaryFrame(allFrames, spec);

  const suggestions = suggestVisualStyles(songDna, 6);
  const selectedStyle =
    getVisualStyle(input.selectedStyleId ?? "") ??
    suggestions[0]?.style ??
    defaultVisualStyle();

  const topSuggestion = suggestions.find((s) => s.style.id === selectedStyle.id);
  const selectionReason =
    topSuggestion?.reason ??
    `${selectedStyle.name} selected as style library default for preview.`;

  const prompt = frame
    ? buildDerivedVisualPrompt({
        frame,
        style: selectedStyle,
        songDna,
        artDirection,
        songTitle: spec.metadata.title,
        artist: spec.metadata.artist,
      })
    : "No performance frame available on render spec.";

  const palette = paletteFromDna(songDna);

  const derivedVisual = createDerivedVisualRecord({
    rvtr,
    frameId: frame?.id ?? "none",
    styleId: selectedStyle.id,
    prompt,
    palette,
    songDna,
    styleName: selectedStyle.name,
    title: buildDerivedVisualTitle(selectedStyle, spec.metadata.title),
    description: frame
      ? buildDerivedVisualDescription(selectedStyle, frame)
      : "No source frame — derived visual metadata only.",
    preferredSceneTypes: selectedStyle.preferredSceneTypes,
    preferredLayouts: selectedStyle.preferredLayouts,
    preferredMoods: selectedStyle.preferredMoods,
  });

  return {
    rvtr,
    frame,
    allFrames,
    suggestions,
    selectedStyle,
    derivedVisual,
    preferredSceneTypes: selectedStyle.preferredSceneTypes,
    identifiedSceneTypes: identifyLabels("scene-type", selectedStyle.preferredSceneTypes),
    identifiedPalette: identifyLabels("palette", palette),
    selectionReason,
  };
}

export function buildDerivedVisualStudioState(input: {
  rvtr: string;
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile | null;
  selectedStyleId?: VisualStyleId;
  frameId?: string;
}): DerivedVisualStudioState {
  return {
    preview: buildDerivedVisualPreview(input),
    allStyles: VISUAL_STYLE_LIBRARY,
  };
}
