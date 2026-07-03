import type { VdjPoolSong } from "../types";
import type { ClusterGroup, ClusterScores, YearAnchors } from "./types";
import { matchesHaystack, songHaystack, vectorDistance, vectorSimilarity } from "./vectors";

export const YEAR_ANCHORS: YearAnchors[] = [
  {
    year: 1967,
    pairs: [
      { label: "sunshine AM", a: "Happy Together", b: "Never My Love" },
      { label: "psychedelic SF", a: "White Rabbit", b: "Wind Cries Mary" },
      { label: "adult contemporary", a: "Something Stupid", b: "To Sir With Love" },
      { label: "garage rock", a: "The Letter", b: "96 Tears" },
      { label: "sunshine AM 2", a: "I'm A Believer", b: "Happy Together" },
    ],
  },
  {
    year: 1978,
    pairs: [
      { label: "disco floor", a: "Le Freak", b: "YMCA" },
      { label: "disco musical", a: "Grease", b: "You Are The One" },
      { label: "soft rock", a: "Baker Street", b: "Magnet and Steel" },
      { label: "arena rock", a: "Surrender", b: "Baba O" },
      { label: "disco radio", a: "September", b: "Tragedy" },
      { label: "new wave", a: "Heart Of Glass", b: "Just What I Needed" },
    ],
  },
  {
    year: 1992,
    pairs: [
      { label: "hip-hop party", a: "Baby Got Back", b: "Jump Around" },
      { label: "grunge", a: "Lithium", b: "Creep" },
      { label: "dance club", a: "Rhythm Is A Dancer", b: "Gonna Make You Sweat" },
      { label: "country boom", a: "Achy Breaky", b: "Chattahoochee" },
      { label: "alt rock", a: "Man On The Moon", b: "Give It Away" },
      { label: "hip-hop", a: "Hip Hop Hooray", b: "Rump Shaker" },
    ],
  },
];

function findClusterForSong(
  haystack: string,
  needle: string,
  clusters: ClusterGroup[],
  pool: VdjPoolSong[],
): string | null {
  for (const song of pool) {
    const h = songHaystack(song);
    if (matchesHaystack(h, needle)) {
      for (const c of clusters) {
        if (c.members.some((m) => m.key === song.key)) return c.label;
      }
    }
  }
  return null;
}

function anchorHits(
  year: number,
  pool: VdjPoolSong[],
  clusters: ClusterGroup[],
): { hits: number; total: number } {
  const anchors = YEAR_ANCHORS.find((a) => a.year === year);
  if (!anchors) return { hits: 0, total: 0 };

  let hits = 0;
  for (const pair of anchors.pairs) {
    const cA = findClusterForSong("", pair.a, clusters, pool);
    const cB = findClusterForSong("", pair.b, clusters, pool);
    if (cA && cB && cA === cB) hits += 1;
  }
  return { hits, total: anchors.pairs.length };
}

function cohesionScore(clusters: ClusterGroup[], vectors: number[][], pool: VdjPoolSong[]): number {
  let sum = 0;
  let count = 0;
  for (const cluster of clusters) {
    const idx = cluster.members
      .map((m) => pool.findIndex((s) => s.key === m.key))
      .filter((i) => i >= 0);
    if (idx.length < 2) continue;
    for (let a = 0; a < idx.length; a += 1) {
      for (let b = a + 1; b < idx.length; b += 1) {
        sum += vectorSimilarity(vectors[idx[a]], vectors[idx[b]]);
        count += 1;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

function separationScore(clusters: ClusterGroup[], vectors: number[][], pool: VdjPoolSong[]): number {
  const centroids = clusters.map((c) => {
    const idx = c.members.map((m) => pool.findIndex((s) => s.key === m.key)).filter((i) => i >= 0);
    return idx.map((i) => vectors[i]);
  }).filter((v) => v.length > 0);

  if (centroids.length < 2) return 0;

  let sum = 0;
  let count = 0;
  for (let a = 0; a < centroids.length; a += 1) {
    for (let b = a + 1; b < centroids.length; b += 1) {
      const ca = average(centroids[a]);
      const cb = average(centroids[b]);
      sum += vectorDistance(ca, cb);
      count += 1;
    }
  }
  const avgDist = count > 0 ? sum / count : 0;
  return Math.min(1, avgDist / Math.sqrt(vectors[0]?.length ?? 1));
}

function average(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i += 1) out[i] += v[i];
  }
  return out.map((v) => v / vectors.length);
}

function silhouetteScore(clusters: ClusterGroup[], vectors: number[][], pool: VdjPoolSong[]): number {
  const assignment = new Map<number, number>();
  clusters.forEach((c, ci) => {
    for (const m of c.members) {
      const i = pool.findIndex((s) => s.key === m.key);
      if (i >= 0) assignment.set(i, ci);
    }
  });

  const indices = [...assignment.keys()];
  if (indices.length < 2) return 0;

  let sum = 0;
  for (const i of indices) {
    const ownCluster = assignment.get(i)!;
    const ownMembers = indices.filter((j) => assignment.get(j) === ownCluster && j !== i);
    const a =
      ownMembers.length > 0
        ? ownMembers.reduce((s, j) => s + vectorDistance(vectors[i], vectors[j]), 0) /
          ownMembers.length
        : 0;

    let b = Infinity;
    for (const c of clusters.keys()) {
      if (c === ownCluster) continue;
      const others = indices.filter((j) => assignment.get(j) === c);
      if (others.length === 0) continue;
      const avg =
        others.reduce((s, j) => s + vectorDistance(vectors[i], vectors[j]), 0) / others.length;
      b = Math.min(b, avg);
    }
    if (b === Infinity) continue;
    const s = (b - a) / Math.max(a, b);
    sum += s;
  }
  return sum / indices.length;
}

function balanceScore(clusters: ClusterGroup[], totalSongs: number): number {
  if (clusters.length === 0 || totalSongs === 0) return 0;
  const sizes = clusters.map((c) => c.count);
  const maxSize = Math.max(...sizes);
  const singletons = sizes.filter((s) => s === 1).length;
  const megaPenalty = maxSize / totalSongs > 0.45 ? 0.3 : 0;
  const singletonPenalty = (singletons / clusters.length) * 0.4;
  const ideal = totalSongs / clusters.length;
  const variance =
    sizes.reduce((s, n) => s + Math.abs(n - ideal) / ideal, 0) / clusters.length;
  const variancePenalty = Math.min(0.4, variance * 0.1);
  return Math.max(0, 1 - megaPenalty - singletonPenalty - variancePenalty);
}

export function scoreRun(
  year: number,
  pool: VdjPoolSong[],
  clusters: ClusterGroup[],
  vectors: number[][],
): ClusterScores {
  const { hits, total } = anchorHits(year, pool, clusters);
  const anchorRate = total > 0 ? hits / total : 0;
  const cohesion = cohesionScore(clusters, vectors, pool);
  const separation = separationScore(clusters, vectors, pool);
  const silhouette = silhouetteScore(clusters, vectors, pool);
  const balance = balanceScore(clusters, pool.length);

  const composite =
    anchorRate * 0.4 +
    cohesion * 0.2 +
    separation * 0.15 +
    Math.max(0, silhouette) * 0.1 +
    balance * 0.15;

  return {
    cohesion,
    separation,
    silhouette,
    balance,
    anchorHits: hits,
    anchorTotal: total,
    composite,
  };
}

export function formatScores(scores: ClusterScores): string {
  return [
    `composite=${scores.composite.toFixed(3)}`,
    `anchors=${scores.anchorHits}/${scores.anchorTotal}`,
    `cohesion=${scores.cohesion.toFixed(3)}`,
    `separation=${scores.separation.toFixed(3)}`,
    `silhouette=${scores.silhouette.toFixed(3)}`,
    `balance=${scores.balance.toFixed(3)}`,
  ].join(" ");
}
