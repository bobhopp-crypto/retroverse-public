/** Collector — Song DNA profile (package creative identity). */

export const SONG_DNA_VERSION = 1 as const;

export type SongDnaLabeledMetric = {
  value: number | string | null;
  label: string;
};

export type SongDnaVisual = {
  dominantPalette: string[];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  brightness: string;
  contrast: string;
  lightingStyle: string;
  cameraEnergy: string;
  stageAtmosphere: string;
  visualTexture: string;
  typographyStyle: string;
  confidence: number | null;
};

export type SongDnaMusical = {
  energy: SongDnaLabeledMetric;
  valence: SongDnaLabeledMetric;
  danceability: SongDnaLabeledMetric;
  acousticness: SongDnaLabeledMetric;
  instrumentalness: SongDnaLabeledMetric;
  liveness: SongDnaLabeledMetric;
  speechiness: SongDnaLabeledMetric;
  tempo: SongDnaLabeledMetric;
  key: SongDnaLabeledMetric;
  mode: SongDnaLabeledMetric;
  timeSignature: SongDnaLabeledMetric;
  source: string;
};

export type SongDnaStory = {
  primaryTheme: string;
  secondaryTheme: string;
  emotionalArc: string;
  storyAngle: string;
  culturalImportance: string;
  performanceImportance: string;
  historicalImportance: string;
  discoveryValue: string;
};

export type SongDnaExperience = {
  overallMood: string;
  visualEnergy: string;
  readingPace: string;
  sceneRhythm: string;
  preferredLayoutStyle: string;
  suggestedOpeningStyle: string;
  suggestedEndingStyle: string;
  recommendedColorFamily: string;
  recommendedMotionStyle: string;
};

export type CollectorSongDna = {
  version: typeof SONG_DNA_VERSION;
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  visual: SongDnaVisual | null;
  musical: SongDnaMusical | null;
  story: SongDnaStory;
  experience: SongDnaExperience;
};
