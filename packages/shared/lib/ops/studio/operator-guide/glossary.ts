import type { GlossaryEntry } from "./types";

/** Canonical Studio glossary — single source for tooltips and guides. */
export const STUDIO_GLOSSARY: Record<string, GlossaryEntry> = {
  rvtr: {
    term: "RVTR",
    definition:
      "Retroverse Track ID — the canonical identity for a song in the music graph. Every production workflow keys off RVTR.",
  },
  collector: {
    term: "Collector",
    definition:
      "Studio department that gathers research, performances, and source material into collector.json.",
  },
  editor: {
    term: "Editor",
    definition:
      "Studio department that shapes the narrative blueprint and editorial package in editor.json.",
  },
  director: {
    term: "Director",
    definition:
      "Studio department that quality-checks the package and produces the experience plan and render spec.",
  },
  narrativeBlueprint: {
    term: "Narrative Blueprint",
    definition:
      "The Editor's structured story plan — angles, facts, and editorial decisions that become the patron experience.",
  },
  patronValue: {
    term: "Patron Value",
    definition:
      "Score (typically 1–10) estimating how compelling this song is for patrons. Higher = prioritize production.",
  },
  confidence: {
    term: "Confidence",
    definition:
      "How complete and trustworthy the research package is: Early → Developing → Good → Strong.",
  },
  performance: {
    term: "Performance",
    definition:
      "A specific recording or video take of a song — Collector may find multiple performances per RVTR.",
  },
  recording: {
    term: "Recording",
    definition: "A captured audio or video instance linked to a performance in the Collector package.",
  },
  songEntity: {
    term: "Song Entity",
    definition: "The canonical RVTR identity — one song in Retroverse regardless of file copies or remixes.",
  },
  renderReady: {
    term: "Render Ready",
    definition:
      "Director has approved the render spec — the experience can be built for patron surfaces without blocking gaps.",
  },
  productionReady: {
    term: "Production Ready",
    definition:
      "All required department artifacts exist and the song is ready for publish/render handoff.",
  },
  storyAngle: {
    term: "Story Angle",
    definition: "A editorial hook or narrative lens Editor selects for the patron experience.",
  },
  experiencePlan: {
    term: "Experience Plan",
    definition:
      "Director output describing how the patron experience should look, feel, and sequence.",
  },
  storyStatus: {
    term: "Story Status",
    definition: "Editorial progress on narrative content — from none through draft to approved.",
  },
  assetCount: {
    term: "Asset Count",
    definition: "Approved images and media attached in the Editor package.",
  },
  performanceCount: {
    term: "Performance Count",
    definition: "Number of distinct performances Collector found for this song.",
  },
};

export function glossaryTerm(key: keyof typeof STUDIO_GLOSSARY): GlossaryEntry {
  return STUDIO_GLOSSARY[key];
}
