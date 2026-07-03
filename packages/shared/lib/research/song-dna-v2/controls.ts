import { clamp01, normLoudness, normTempo } from "@/lib/research/song-dna-visual-synth/normalize";
import type { AcousticMetrics } from "@/lib/research/song-dna-visual-synth/types";

import type { SongDnaV2Controls } from "./types";

/** Map Spotify acoustic metrics → engine control parameters (never used as raw draw coords). */
export function buildControls(metrics: AcousticMetrics): SongDnaV2Controls {
  return {
    metrics,
    atmosphereDensity: clamp01(metrics.acousticness),
    emptySpace: clamp01(metrics.instrumentalness * 0.85 + 0.08),
    warmth: clamp01(metrics.valence),
    repetition: clamp01(metrics.danceability),
    spacing: normTempo(metrics.tempo),
    strokeWeight: clamp01(metrics.energy),
    sparkCount: Math.round(clamp01(metrics.liveness) * 220),
    fragmentation: clamp01(metrics.speechiness * 4),
    glowStrength: normLoudness(metrics.loudness),
  };
}
