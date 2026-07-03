import type { CollectorSongDna, SongDnaLabeledMetric } from "@/lib/ops/studio/collector/song-dna-types";

import type { SongDnaEnrichmentSlots, SongDnaSignalSlot } from "./types";

function metric(
  dna: CollectorSongDna,
  key: keyof Omit<NonNullable<CollectorSongDna["musical"]>, "source">,
): SongDnaSignalSlot | null {
  const m = dna.musical?.[key] as SongDnaLabeledMetric | undefined;
  if (!m) return null;
  return {
    id: String(key),
    label: m.label,
    category: "musical",
    value: typeof m.value === "number" ? m.value : null,
    displayValue: m.label,
    available: m.value != null,
    source: dna.musical?.source ?? "song-dna",
  };
}

export function buildSongDnaSignals(dna: CollectorSongDna): SongDnaSignalSlot[] {
  const signals: SongDnaSignalSlot[] = [
    {
      id: "personality",
      label: "Personality",
      category: "core",
      value: dna.experience.overallMood,
      displayValue: dna.experience.overallMood,
      available: true,
      source: "song-dna.experience",
    },
    {
      id: "visual_energy",
      label: "Visual energy",
      category: "visual",
      value: dna.experience.visualEnergy,
      displayValue: dna.experience.visualEnergy,
      available: true,
      source: "song-dna.experience",
    },
    {
      id: "primary_theme",
      label: "Primary theme",
      category: "narrative",
      value: dna.story.primaryTheme,
      displayValue: dna.story.primaryTheme,
      available: true,
      source: "song-dna.story",
    },
    {
      id: "emotional_arc",
      label: "Emotional arc",
      category: "narrative",
      value: dna.story.emotionalArc,
      displayValue: dna.story.emotionalArc,
      available: true,
      source: "song-dna.story",
    },
  ];

  if (dna.musical) {
    const metricKeys = [
      "energy",
      "valence",
      "danceability",
      "acousticness",
      "instrumentalness",
      "liveness",
      "speechiness",
      "tempo",
      "key",
      "mode",
      "timeSignature",
    ] as const;
    for (const key of metricKeys) {
      const slot = metric(dna, key);
      if (slot) signals.push(slot);
    }
  }

  if (dna.visual) {
    signals.push(
      {
        id: "lighting",
        label: "Lighting",
        category: "visual",
        value: dna.visual.lightingStyle,
        displayValue: dna.visual.lightingStyle.replace(/_/g, " "),
        available: true,
        source: "song-dna.visual",
      },
      {
        id: "stage_atmosphere",
        label: "Stage atmosphere",
        category: "visual",
        value: dna.visual.stageAtmosphere,
        displayValue: dna.visual.stageAtmosphere.replace(/_/g, " "),
        available: true,
        source: "song-dna.visual",
      },
    );
  }

  return signals;
}

export function buildEnrichmentSlots(): SongDnaEnrichmentSlots {
  return {
    spotifyAudioFeatures: false,
    acousticFingerprint: false,
    chordProgression: false,
    aiEmbedding: false,
    instrumentRecognition: false,
    moodCluster: false,
    djMetadata: false,
    performanceHistory: false,
    remixRelationships: false,
  };
}

export function countAvailableEnrichment(slots: SongDnaEnrichmentSlots): number {
  return Object.values(slots).filter(Boolean).length;
}
