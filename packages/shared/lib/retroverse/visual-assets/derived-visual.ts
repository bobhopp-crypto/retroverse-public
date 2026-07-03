import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

import { VISUAL_STYLE_LIBRARY } from "./style-library";
import type { StyleSuggestion, VisualStyleDefinition } from "./types";

type DnaSignals = Record<string, boolean>;

function includesAny(haystack: string, needles: string[]): boolean {
  const n = haystack.toLowerCase();
  return needles.some((needle) => n.includes(needle.toLowerCase()));
}

function metricLabel(dna: CollectorSongDna | null, key: keyof NonNullable<CollectorSongDna["musical"]>): string {
  if (!dna?.musical) return "";
  const metric = dna.musical[key];
  return typeof metric === "object" && metric && "label" in metric ? String(metric.label) : "";
}

function tempoValue(dna: CollectorSongDna | null): number | null {
  const raw = dna?.musical?.tempo?.value;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function extractDnaSignals(dna: CollectorSongDna | null): DnaSignals {
  const visual = dna?.visual;
  const experience = dna?.experience;
  const story = dna?.story;
  const energy = metricLabel(dna, "energy");
  const valence = metricLabel(dna, "valence");
  const dance = metricLabel(dna, "danceability");
  const acoustic = metricLabel(dna, "acousticness");
  const instrumental = metricLabel(dna, "instrumentalness");
  const speech = metricLabel(dna, "speechiness");
  const tempo = tempoValue(dna);

  return {
    low_energy: includesAny(energy, ["low"]) || includesAny(experience?.visualEnergy ?? "", ["low", "still"]),
    high_energy: includesAny(energy, ["high"]) || includesAny(experience?.visualEnergy ?? "", ["high", "kinetic"]),
    medium_energy: includesAny(energy, ["medium", "moderate", "balanced"]),
    dark_valence: includesAny(valence, ["dark", "sad", "melanch"]),
    bright_valence: includesAny(valence, ["bright", "happy", "positive"]),
    balanced_valence: includesAny(valence, ["balanced", "neutral"]),
    high_danceability: includesAny(dance, ["high"]),
    high_acousticness: includesAny(acoustic, ["high"]),
    instrumental: includesAny(instrumental, ["high"]),
    high_speechiness: includesAny(speech, ["high"]),
    slow_tempo: tempo !== null && tempo < 95,
    moderate_tempo: tempo !== null && tempo >= 95 && tempo <= 120,
    fast_tempo: tempo !== null && tempo > 120,
    television_lighting: includesAny(visual?.lightingStyle ?? "", ["television", "broadcast"]),
    concert_blue: includesAny(visual?.lightingStyle ?? "", ["concert_blue", "concert"]),
    broadcast_stage: includesAny(visual?.stageAtmosphere ?? "", ["broadcast"]),
    stage_smoke: includesAny(visual?.stageAtmosphere ?? "", ["smoke", "stage"]),
    minimal_typography: includesAny(visual?.typographyStyle ?? "", ["minimal"]),
    cinematic_typography: includesAny(visual?.typographyStyle ?? "", ["cinematic"]),
    still_camera: includesAny(visual?.cameraEnergy ?? "", ["static", "still"]),
    magazine_layout: includesAny(experience?.preferredLayoutStyle ?? "", ["magazine"]),
    collector_layout: includesAny(experience?.preferredLayoutStyle ?? "", ["collector"]),
    leisurely_pace: includesAny(experience?.readingPace ?? "", ["leisurely"]),
    brisk_pace: includesAny(experience?.readingPace ?? "", ["brisk"]),
    reflective_mood: includesAny(experience?.overallMood ?? "", ["reflect", "television", "breakthrough"]),
    performance_mood: includesAny(experience?.overallMood ?? "", ["performance", "concert", "stage"]),
    performance_driven: includesAny(story?.emotionalArc ?? "", ["performance"]),
    cultural_mood: includesAny(story?.culturalImportance ?? "", ["strong", "high", "landmark"]),
    historical_importance: includesAny(story?.historicalImportance ?? "", ["strong", "high"]),
    story_driven: Boolean(story?.primaryTheme),
    dominant_palette: Boolean(visual?.dominantPalette?.length),
    "1980s_era": includesAny(`${dna?.title ?? ""} ${story?.primaryTheme ?? ""}`, ["198"]) ||
      includesAny(experience?.overallMood ?? "", ["1980", "mtv", "television"]),
    electronic: includesAny(`${dance} ${acoustic} ${instrumental}`, ["electronic"]) ||
      includesAny(experience?.overallMood ?? "", ["dance", "electronic"]),
    studio_texture: includesAny(visual?.visualTexture ?? "", ["grain", "paper", "studio"]),
  };
}

function scoreStyle(style: VisualStyleDefinition, signals: DnaSignals): StyleSuggestion {
  let score = 0;
  const matched: string[] = [];

  for (const affinity of style.dnaAffinities) {
    if (signals[affinity]) {
      score += 2;
      matched.push(affinity);
    }
  }

  for (const mood of style.preferredMoods) {
    if (signals.reflective_mood && includesAny(mood, ["reflect", "dark", "gentle"])) score += 1;
    if (signals.performance_mood && includesAny(mood, ["performance", "concert", "live", "electric"])) score += 1;
    if (signals.bright_valence && includesAny(mood, ["bright", "triumph", "playful"])) score += 1;
  }

  const reason =
    matched.length > 0
      ? `Song DNA signals (${matched.slice(0, 4).join(", ").replace(/_/g, " ")}) align with ${style.name}.`
      : `${style.name} provides baseline variety from performance frame composition.`;

  return {
    style,
    score,
    reason,
    dnaSources: matched.map((m) => `musical/visual/experience:${m}`),
  };
}

export function suggestVisualStyles(
  dna: CollectorSongDna | null,
  limit = 6,
): StyleSuggestion[] {
  const signals = extractDnaSignals(dna);
  const ranked = VISUAL_STYLE_LIBRARY.map((style) => scoreStyle(style, signals)).sort(
    (a, b) => b.score - a.score || a.style.name.localeCompare(b.style.name),
  );

  const top = ranked.filter((s) => s.score > 0).slice(0, limit);
  if (top.length >= 3) return top;

  return ranked.slice(0, limit);
}

export function paletteFromDna(dna: CollectorSongDna | null): string[] {
  const visual = dna?.visual;
  if (!visual) return [];
  const colors = [
    visual.primaryColor,
    visual.secondaryColor,
    visual.accentColor,
    ...(visual.dominantPalette ?? []),
  ].filter((c) => c?.startsWith("#"));
  return [...new Set(colors)].slice(0, 5);
}
