import type { SongDnaLabeledMetric } from "./song-dna-types";

const SPOTIFY_KEY_NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

export function labeledMetric(value: number | string | null, label: string): SongDnaLabeledMetric {
  return { value, label };
}

export function labelEnergy(value: number | null): string {
  if (value == null) return "Unknown";
  if (value >= 0.7) return "High";
  if (value >= 0.45) return "Moderate";
  return "Low";
}

export function labelValence(value: number | null): string {
  if (value == null) return "Unknown";
  if (value >= 0.65) return "Bright";
  if (value >= 0.4) return "Balanced";
  return "Dark";
}

export function labelDanceability(value: number | null): string {
  if (value == null) return "Unknown";
  if (value >= 0.65) return "High";
  if (value >= 0.4) return "Moderate";
  return "Low";
}

export function labelAcousticness(value: number | null): string {
  if (value == null) return "Unknown";
  if (value >= 0.6) return "Acoustic";
  if (value >= 0.25) return "Mixed";
  return "Electronic";
}

export function labelRatioFeature(value: number | null, high: string, moderate: string, low: string): string {
  if (value == null) return "Unknown";
  if (value >= 0.5) return high;
  if (value >= 0.15) return moderate;
  return low;
}

export function labelTempo(bpm: number | null): string {
  if (bpm == null) return "Unknown";
  if (bpm >= 130) return "Fast";
  if (bpm >= 105) return "Uptempo";
  if (bpm >= 80) return "Moderate";
  return "Slow";
}

export function labelSpotifyKey(key: number | null, mode: number | null): string {
  if (key == null || key < 0 || key > 11) return "Unknown";
  const name = SPOTIFY_KEY_NAMES[key] ?? "Unknown";
  if (mode === 1) return `${name} major`;
  if (mode === 0) return `${name} minor`;
  return name;
}

export function labelMode(mode: number | null): string {
  if (mode === 1) return "Major";
  if (mode === 0) return "Minor";
  return "Unknown";
}

export function labelTimeSignature(value: number | null): string {
  if (value == null) return "Unknown";
  if (value === 4) return "4/4 Common time";
  if (value === 3) return "3/4 Waltz";
  if (value === 5) return "5/4 Asymmetric";
  return `${value}/4`;
}

export function vdjBpmToTempo(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 40) return Math.round(n);
  if (n > 0 && n < 2) return Math.round(60 / n);
  return Math.round(n);
}
