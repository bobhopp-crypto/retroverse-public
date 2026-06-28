export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normMetric(value: number | null | undefined, fallback = 0.5): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  if (value >= 0 && value <= 1) return value;
  return fallback;
}

/** Spotify loudness dBFS — louder tracks sit near -5, quiet near -30. */
export function normLoudness(db: number | null | undefined, fallback = 0.55): number {
  if (db == null || !Number.isFinite(db)) return fallback;
  return clamp01((db + 24) / 18);
}

export function normTempo(bpm: number | null | undefined, fallback = 0.45): number {
  if (bpm == null || !Number.isFinite(bpm)) return fallback;
  return clamp01((bpm - 60) / 140);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}
