import type { AcousticMetrics } from "@/lib/research/song-dna-visual-synth/types";

import type { CompositionLayout } from "./engines/composition";

export const CANVAS = 1200;

export type SongDnaV2Controls = {
  metrics: AcousticMetrics;
  /** Atmosphere blob count driven by acousticness. */
  atmosphereDensity: number;
  /** Fraction of canvas left void — driven by instrumentalness. */
  emptySpace: number;
  /** 0 cool … 1 warm — driven by valence. */
  warmth: number;
  /** Rhythm stroke count — driven by danceability. */
  repetition: number;
  /** Stroke spacing factor — driven by tempo. */
  spacing: number;
  /** Stroke weight — driven by energy. */
  strokeWeight: number;
  /** Spark count — driven by liveness. */
  sparkCount: number;
  /** Fragmentation 0 round … 1 angular — driven by speechiness. */
  fragmentation: number;
  /** Glow strength — driven by loudness. */
  glowStrength: number;
};

export type EngineLayers = {
  background: string;
  rhythm: string;
  particles: string;
  lighting: string;
  composition: string;
  signature: string;
  layout: CompositionLayout;
};

export type RenderStages = {
  "01-background": string;
  "02-rhythm": string;
  "03-particles": string;
  "04-lighting": string;
  "05-final": string;
};
