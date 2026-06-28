import type { CollectorPackage } from "./types";
import { loadMusicalDnaSource, loadVdjMusicalHints } from "./load-musical-dna";
import {
  labelAcousticness,
  labelDanceability,
  labelEnergy,
  labelMode,
  labelRatioFeature,
  labelSpotifyKey,
  labelTempo,
  labelTimeSignature,
  labelValence,
  labeledMetric,
} from "./musical-dna-labels";
import type {
  CollectorSongDna,
  SongDnaExperience,
  SongDnaMusical,
  SongDnaStory,
  SongDnaVisual,
} from "./song-dna-types";
import { SONG_DNA_VERSION } from "./song-dna-types";
import type { CollectorVisualIdentityPackage, VisualIdentityProfile } from "./visual-identity-types";

function visualFromProfile(profile: VisualIdentityProfile): SongDnaVisual {
  return {
    dominantPalette: profile.palette,
    primaryColor: profile.primaryColor,
    secondaryColor: profile.secondaryColor,
    accentColor: profile.accentColor,
    brightness: profile.brightness,
    contrast: profile.contrast,
    lightingStyle: profile.lighting,
    cameraEnergy: profile.cameraEnergy,
    stageAtmosphere: profile.atmosphere,
    visualTexture: profile.texture,
    typographyStyle: profile.typography,
    confidence: profile.confidence,
  };
}

function collectorMediaPaths(pkg: CollectorPackage): string[] {
  return [
    pkg.virtualDj?.primaryPath,
    pkg.videoPerformance?.preferredPerformance,
    ...(pkg.virtualDj?.mediaItems ?? []).map((m) => m.filePath),
  ].filter((p): p is string => Boolean(p));
}

async function buildMusicalDna(
  pkg: CollectorPackage,
  vdjKey: string | null,
): Promise<SongDnaMusical | null> {
  const row = await loadMusicalDnaSource({
    rvtr: pkg.rvtr,
    artist: pkg.artist,
    title: pkg.title,
    mediaPaths: collectorMediaPaths(pkg),
  });

  if (!row) return null;

  const keyLabel =
    row.key != null ? labelSpotifyKey(row.key, row.mode) : vdjKey ? vdjKey : "Unknown";

  return {
    energy: labeledMetric(row.energy, labelEnergy(row.energy)),
    valence: labeledMetric(row.valence, labelValence(row.valence)),
    danceability: labeledMetric(row.danceability, labelDanceability(row.danceability)),
    acousticness: labeledMetric(row.acousticness, labelAcousticness(row.acousticness)),
    instrumentalness: labeledMetric(
      row.instrumentalness,
      labelRatioFeature(row.instrumentalness, "Instrumental", "Some vocals", "Vocal-led"),
    ),
    liveness: labeledMetric(
      row.liveness,
      labelRatioFeature(row.liveness, "Live feel", "Studio-polished", "Studio"),
    ),
    speechiness: labeledMetric(
      row.speechiness,
      labelRatioFeature(row.speechiness, "Speech-heavy", "Some speech", "Sung"),
    ),
    tempo: labeledMetric(row.tempo, labelTempo(row.tempo)),
    key: labeledMetric(row.key != null ? row.key : vdjKey, keyLabel),
    mode: labeledMetric(row.mode, labelMode(row.mode)),
    timeSignature: labeledMetric(row.time_signature, labelTimeSignature(row.time_signature)),
    source: row.source,
  };
}

function importanceLabel(score: number, high: string, moderate: string, low: string): string {
  if (score >= 0.7) return high;
  if (score >= 0.4) return moderate;
  return low;
}

function buildStoryDna(pkg: CollectorPackage): SongDnaStory {
  const seed = pkg.storySeed;
  const peak = pkg.charts.peakHot100;
  const weeks = pkg.charts.chartWeeks ?? 0;
  const perfCount =
    pkg.performances?.length ?? pkg.videoPerformance.items.filter((i) => i.isVideo).length;
  const cultureNotes = pkg.culturalContext.notes.length;
  const factCount = pkg.candidateFacts.length;
  const hasVideo = perfCount > 0;

  let primaryTheme = "Identity";
  let secondaryTheme = "Recording";
  if (peak != null && peak <= 20) {
    primaryTheme = "Chart success";
    secondaryTheme = cultureNotes > 0 ? "Cultural moment" : "Commercial reach";
  } else if (hasVideo) {
    primaryTheme = "Performance";
    secondaryTheme = cultureNotes > 0 ? "Cultural context" : "Visual story";
  } else if (cultureNotes >= 2) {
    primaryTheme = "Cultural context";
    secondaryTheme = "Legacy";
  }

  const chartScore = peak != null ? Math.max(0, 1 - (peak - 1) / 100) : 0;
  const cultureScore = Math.min(1, cultureNotes / 4);
  const perfScore = Math.min(1, perfCount / 2);
  const factScore = Math.min(1, factCount / 12);

  const emotionalArc =
    peak != null && peak <= 10
      ? "Triumph"
      : peak != null && peak <= 40
        ? "Breakthrough"
        : hasVideo
          ? "Performance-driven"
          : "Reflective";

  return {
    primaryTheme,
    secondaryTheme,
    emotionalArc,
    storyAngle: seed?.suggestedAngle ?? (pkg.recording.summary || "Canonical song story"),
    culturalImportance: importanceLabel(
      cultureScore,
      "Strong cultural footprint",
      "Some cultural context",
      "Limited cultural notes",
    ),
    performanceImportance: importanceLabel(
      perfScore,
      "Owned performance is central",
      "Performance supports the story",
      "Performance imagery limited",
    ),
    historicalImportance: importanceLabel(
      chartScore,
      peak != null ? `Hot 100 peak #${peak} · ${weeks} weeks` : "Chart history thin",
      "Moderate chart footprint",
      "Limited chart signal",
    ),
    discoveryValue: importanceLabel(
      (pkg.researchQuality / 100) * 0.5 + factScore * 0.5,
      "Rich discovery potential",
      "Solid discovery layer",
      "Needs more research depth",
    ),
  };
}

function colorFamily(primaryColor: string | null): string {
  if (!primaryColor || !primaryColor.startsWith("#") || primaryColor.length < 7) return "Neutral";
  const r = parseInt(primaryColor.slice(1, 3), 16);
  const g = parseInt(primaryColor.slice(3, 5), 16);
  const b = parseInt(primaryColor.slice(5, 7), 16);
  if (b > r + 30 && b > g + 20) return "Cool blues";
  if (r > g + 25 && r > b + 25) return "Warm ambers";
  if (g > r + 20 && g > b + 10) return "Earth greens";
  if (r + g + b < 120) return "Deep shadows";
  if (r + g + b > 620) return "Bright neutrals";
  return "Balanced midtones";
}

function buildExperienceDna(
  visual: SongDnaVisual | null,
  musical: SongDnaMusical | null,
  story: SongDnaStory,
): SongDnaExperience {
  const mood = visual?.lightingStyle
    ? `${visual.lightingStyle.replace(/_/g, " ")} · ${story.emotionalArc.toLowerCase()}`
    : story.emotionalArc;

  const musicalEnergy = musical?.energy.label ?? "Unknown";
  const visualEnergy = visual?.cameraEnergy ?? "steady";
  const tempoLabel = musical?.tempo.label ?? "Moderate";
  const danceLabel = musical?.danceability.label ?? "Moderate";

  const readingPace =
    tempoLabel === "Fast" || tempoLabel === "Uptempo"
      ? "Brisk"
      : tempoLabel === "Slow"
        ? "Leisurely"
        : "Measured";

  const sceneRhythm =
    danceLabel === "High" || visualEnergy === "kinetic"
      ? "Quick cuts"
      : danceLabel === "Low"
        ? "Long holds"
        : "Moderate pacing";

  const layoutStyle =
    visual?.lightingStyle === "studio_clean"
      ? "Editorial clean"
      : visual?.lightingStyle === "concert_blue" || visual?.lightingStyle === "neon"
        ? "Immersive stage"
        : "Magazine feature";

  const openingStyle =
    story.primaryTheme === "Performance"
      ? "Performance hook"
      : story.primaryTheme === "Chart success"
        ? "Chart milestone open"
        : "Hero identity";

  const endingStyle =
    story.historicalImportance.includes("peak")
      ? "Chart echo close"
      : story.primaryTheme === "Performance"
        ? "Return to performance"
        : "Legacy takeaway";

  return {
    overallMood: mood,
    visualEnergy: `${visualEnergy} · ${musicalEnergy} energy`,
    readingPace,
    sceneRhythm,
    preferredLayoutStyle: layoutStyle,
    suggestedOpeningStyle: openingStyle,
    suggestedEndingStyle: endingStyle,
    recommendedColorFamily: colorFamily(visual?.primaryColor ?? null),
    recommendedMotionStyle:
      visualEnergy === "kinetic" || musicalEnergy === "High"
        ? "Dynamic transitions"
        : musicalEnergy === "Low"
          ? "Slow dissolve"
          : "Gentle crossfade",
  };
}

export async function buildSongDnaPackage(
  pkg: CollectorPackage,
  visualIdentity: CollectorVisualIdentityPackage | null,
): Promise<CollectorSongDna> {
  const profile = visualIdentity?.profile ?? null;
  const visual = profile ? visualFromProfile(profile) : null;
  const vdjHints = await loadVdjMusicalHints(collectorMediaPaths(pkg));
  const musical = await buildMusicalDna(pkg, vdjHints.key);
  const story = buildStoryDna(pkg);
  const experience = buildExperienceDna(visual, musical, story);

  return {
    version: SONG_DNA_VERSION,
    rvtr: pkg.rvtr.trim().toUpperCase(),
    artist: pkg.artist,
    title: pkg.title,
    generatedAt: new Date().toISOString(),
    visual,
    musical,
    story,
    experience,
  };
}
