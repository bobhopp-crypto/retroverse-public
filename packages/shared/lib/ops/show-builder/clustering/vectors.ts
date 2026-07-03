import { associationVector1967 } from "../cultural-association-1967";
import { associationVector1978 } from "../cultural-association-1978";
import { associationVector1992 } from "../cultural-association-1992";
import type { VdjPoolSong } from "../types";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function songFeatureVector(song: VdjPoolSong): number[] {
  if (song.year === 1967) return associationVector1967(song);
  if (song.year === 1978) return associationVector1978(song);
  if (song.year === 1992) return associationVector1992(song);

  const text = normalizeText(`${song.artist} ${song.title}`);
  const tokens = text.split(" ").filter((t) => t.length > 2);
  const dims = 12;
  const vec = new Array(dims).fill(0);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i += 1) h = (h * 31 + token.charCodeAt(i)) % dims;
    vec[h] += 1;
  }
  const artistKey = normalizeText(song.artist);
  vec[dims - 1] = [...artistKey].reduce((n, c) => n + c.charCodeAt(0), 0) % 7;
  const sum = vec.reduce((a, b) => a + b, 0) || 1;
  return vec.map((v) => v / sum);
}

export function vectorDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Higher = more culturally associated. Range ~0–1. */
export function vectorSimilarity(a: number[], b: number[]): number {
  const maxDist = Math.sqrt(a.length);
  return 1 - Math.min(1, vectorDistance(a, b) / maxDist);
}

export function averageVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i += 1) out[i] += v[i];
  }
  return out.map((v) => v / vectors.length);
}

export function pickClusterCount(songCount: number): number {
  if (songCount <= 6) return Math.max(2, Math.min(5, songCount));
  if (songCount <= 20) return 5;
  if (songCount <= 35) return 6;
  if (songCount <= 55) return 7;
  return 8;
}

export function songHaystack(song: VdjPoolSong): string {
  return normalizeText(`${song.artist} ${song.title}`);
}

export function matchesHaystack(haystack: string, needle: string): boolean {
  return haystack.includes(normalizeText(needle));
}
