import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { TrackRelatedSong } from "@/lib/track/load-track-page";

import type { SongDnaCollectorHints } from "./enrichment";
import type { SongDnaChapter, SongDnaChapterId, SongDnaExperience, SongDnaVisualLanguage } from "./types";

export const SONG_DNA_VISUAL_LANGUAGE = (dna: CollectorSongDna): SongDnaVisualLanguage => ({
  palette: dna.visual?.dominantPalette ?? ["#1a7a7a", "#e85d04", "#090B09", "#BFA193"],
  typography: {
    display: "Scientific serif — museum exhibit headline",
    body: "Humanist sans — approachable, zero jargon",
    accent: dna.visual?.typographyStyle ?? "editorial",
  },
  texture: `${dna.visual?.visualTexture ?? "grain"} · ${dna.visual?.lightingStyle?.replace(/_/g, " ") ?? "warm light"}`,
  signature: "The Retroverse Song DNA — why this song feels the way it does",
  mood: dna.experience.overallMood,
});

function genreBlend(dna: CollectorSongDna): string {
  const parts: string[] = [];
  if (dna.musical?.danceability.label) parts.push(dna.musical.danceability.label + " groove");
  if (dna.musical?.acousticness.label) parts.push(dna.musical.acousticness.label + " warmth");
  if (dna.musical?.energy.label) parts.push(dna.musical.energy.label + " energy");
  return parts.length > 0 ? parts.join(" · ") : "Distinctive blend";
}

function personalityTraits(dna: CollectorSongDna): string[] {
  return [
    dna.story.emotionalArc,
    dna.experience.overallMood,
    dna.musical?.valence.label ? `${dna.musical.valence.label} emotional tone` : "",
    dna.musical?.energy.label ? `${dna.musical.energy.label} drive` : "",
  ].filter(Boolean);
}

export function buildSongDnaChapters(input: {
  dna: CollectorSongDna;
  hints: SongDnaCollectorHints;
  relatedTracks: TrackRelatedSong[];
}): { chapters: SongDnaChapter[]; skipped: SongDnaChapter[] } {
  const { dna, hints, relatedTracks } = input;
  const m = dna.musical;

  const defs: SongDnaChapter[] = [
    {
      id: "identity",
      title: "Identity",
      subtitle: "Musical fingerprint · genre blend · personality",
      narrativeHook: `This song's personality: ${dna.experience.overallMood}. ${genreBlend(dna)}.`,
      visualConcept: "Animated DNA spiral · color-coded personality ring · genre constellation",
      motionConcept: "fingerprint_pulse",
      audienceBeat: "Meet the song before the science",
      included: true,
      payload: {
        fingerprint: genreBlend(dna),
        traits: personalityTraits(dna),
        theme: dna.story.primaryTheme,
      },
    },
    {
      id: "energy",
      title: "Energy",
      subtitle: "Energy curve · emotional arc · dynamic intensity",
      narrativeHook: m
        ? `${m.energy.label} energy with a ${dna.story.emotionalArc.toLowerCase()} emotional arc.`
        : "Feel the dynamic intensity.",
      visualConcept: "Flowing waveform · particle intensity field · emotional arc curve",
      motionConcept: "wave_flow",
      audienceBeat: "Feel the lift and release",
      included: Boolean(m?.energy),
      skipReason: "Energy signal unavailable",
      payload: {
        energy: m?.energy.label,
        energyValue: m?.energy.value,
        valence: m?.valence.label,
        arc: dna.story.emotionalArc,
      },
    },
    {
      id: "rhythm",
      title: "Rhythm",
      subtitle: "Tempo · groove · danceability · pulse",
      narrativeHook: m
        ? `${m.tempo.label} at ${typeof m.tempo.value === "number" ? Math.round(m.tempo.value) : "?"} BPM — ${m.danceability.label} danceability.`
        : "The pulse that moves the body.",
      visualConcept: "Pulse rings · orbiting beat markers · tempo-driven motion graphics",
      motionConcept: "pulse_ring",
      audienceBeat: "Lock into the groove",
      included: Boolean(m?.tempo && m?.danceability),
      skipReason: "Rhythm signals unavailable",
      payload: {
        tempo: m?.tempo.value,
        tempoLabel: m?.tempo.label,
        danceability: m?.danceability.label,
      },
    },
    {
      id: "harmony",
      title: "Harmony",
      subtitle: "Key · mood · harmonic color · tension vs release",
      narrativeHook: m
        ? `Rooted in ${m.key.label} — ${m.valence.label} harmonic mood.`
        : "The color of the chords.",
      visualConcept: "Color field bloom · key wheel · tension/release gradient",
      motionConcept: "color_bloom",
      audienceBeat: "Understand the emotional color",
      included: Boolean(m?.key),
      skipReason: "Harmonic data unavailable",
      payload: {
        key: m?.key.label,
        mode: m?.mode.label,
        valence: m?.valence.label,
      },
    },
    {
      id: "instrumentation",
      title: "Instrumentation",
      subtitle: "Lead · supporting · layer visualization",
      narrativeHook:
        hints.instrumentHints[0] ??
        (m?.instrumentalness.label === "Vocal-led"
          ? "A vocal-led arrangement — instruments frame the voice."
          : "Layers of sound orbiting the center."),
      visualConcept: "Orbiting instrument nodes · layer depth · constellation layout",
      motionConcept: "orbit_spin",
      audienceBeat: "See the layers",
      included: Boolean(m?.instrumentalness || hints.instrumentHints.length > 0),
      skipReason: "No instrumentation hints",
      payload: { layers: hints.instrumentHints, instrumentalness: m?.instrumentalness.label },
    },
    {
      id: "vocals",
      title: "Vocals",
      subtitle: "Style · harmony · delivery · character",
      narrativeHook:
        hints.vocalNotes[0] ??
        (m?.speechiness.label === "Sung"
          ? "Fully sung delivery — storytelling through melody."
          : "The voice carries the identity."),
      visualConcept: "Vocal wave ribbon · character portrait glow · harmony trails",
      motionConcept: "wave_flow",
      audienceBeat: "Hear the human element",
      included: Boolean(m?.speechiness || m?.instrumentalness || hints.vocalNotes.length > 0),
      skipReason: "Vocal character unavailable",
      payload: {
        speechiness: m?.speechiness.label,
        delivery: m?.instrumentalness.label,
        notes: hints.vocalNotes,
      },
    },
    {
      id: "production",
      title: "Production",
      subtitle: "Studio techniques · sonic texture · space",
      narrativeHook:
        hints.recordingStudio ??
        (m?.liveness.label === "Studio"
          ? "Crafted in the studio — polished and intentional."
          : "The sonic space where it was made."),
      visualConcept: "Studio depth field · texture morph · analog warmth vs digital edge",
      motionConcept: "texture_morph",
      audienceBeat: "Step inside the sound",
      included: Boolean(hints.recordingStudio || m?.liveness || hints.productionNotes.length > 0),
      skipReason: "Production context unavailable",
      payload: {
        studio: hints.recordingStudio,
        liveness: m?.liveness.label,
        acousticness: m?.acousticness.label,
        notes: hints.productionNotes,
      },
    },
    {
      id: "similarities",
      title: "Similarities",
      subtitle: "Musical neighbors · shared DNA",
      narrativeHook:
        relatedTracks.length > 0
          ? `${relatedTracks.length} musical neighbor${relatedTracks.length > 1 ? "s" : ""} in the Retroverse graph.`
          : "Songs that share this DNA fingerprint.",
      visualConcept: "Constellation map · floating neighbor covers · DNA thread lines",
      motionConcept: "neighbor_float",
      audienceBeat: "Discover the family",
      included: relatedTracks.length > 0,
      skipReason: "No related tracks in graph",
      payload: {
        neighbors: relatedTracks.slice(0, 6).map((t) => ({
          rvtr: t.rvtr,
          title: t.title,
          peak: t.peakHot100,
          coverUrl: t.coverUrl,
        })),
      },
    },
    {
      id: "legacy",
      title: "Legacy",
      subtitle: "Why this sound mattered · lasting identity",
      narrativeHook: hints.legacyNotes[0] ?? dna.story.culturalImportance,
      visualConcept: "Ripple outward · influence trails · museum closing panel",
      motionConcept: "constellation_reveal",
      audienceBeat: "Leave understanding why it endures",
      included: hints.legacyNotes.length > 0,
      skipReason: "Legacy narrative unavailable",
      payload: { threads: hints.legacyNotes },
    },
  ];

  const order: SongDnaChapterId[] = [
    "identity",
    "energy",
    "rhythm",
    "harmony",
    "instrumentation",
    "vocals",
    "production",
    "similarities",
    "legacy",
  ];

  const sorted = order.map((id) => defs.find((d) => d.id === id)!).filter(Boolean);
  return {
    chapters: sorted.filter((c) => c.included),
    skipped: sorted.filter((c) => !c.included),
  };
}

export function buildExecutiveSummary(dna: CollectorSongDna): SongDnaExperience["executiveSummary"] {
  return {
    headline: `Why "${dna.title}" feels ${dna.experience.overallMood}`,
    personality: personalityTraits(dna).join(" · "),
    oneLine: `A ${dna.musical?.energy.label ?? "distinctive"} ${dna.story.emotionalArc.toLowerCase()} — ${dna.story.primaryTheme.toLowerCase()}.`,
    strengths: [
      dna.musical ? "Full musical DNA profile" : "Partial profile",
      dna.visual ? "Visual identity extracted from artwork" : "Visual pending",
      dna.story.discoveryValue,
    ],
  };
}

export function buildDnaOverview(
  dna: CollectorSongDna,
  signalCount: number,
  enrichmentAvailable: number,
): SongDnaExperience["overview"] {
  return {
    fingerprintLabel: genreBlend(dna),
    genreBlend: genreBlend(dna),
    personalityTraits: personalityTraits(dna),
    signalCount,
    enrichmentAvailable,
  };
}
