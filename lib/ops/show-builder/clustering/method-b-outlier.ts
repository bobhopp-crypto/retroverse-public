import { CLUSTER_PALETTE } from "./palette";
import type { VdjPoolSong } from "../types";
import { averageVector, pickClusterCount, songFeatureVector, vectorDistance, vectorSimilarity } from "./vectors";
import type { ClusterGroup, ClusterRunOptions, ClusterRunResult } from "./types";
import { dedupePool, toMember } from "./types";
import { buildRunResult } from "./build-result";

const CLUSTER_LETTERS = "ABCDEFGH";

function clusterLetter(index: number): string {
  return `Cluster ${CLUSTER_LETTERS[index] ?? String(index + 1)}`;
}

/**
 * Method B — iterative outlier removal.
 * Build one coherent pile at a time: hub → grow by affinity → peel misfits → save → repeat.
 */
export function runMethodB(
  songs: VdjPoolSong[],
  year: number,
  options: ClusterRunOptions,
): ClusterRunResult {
  const pool = dedupePool(songs);
  const vectors = pool.map(songFeatureVector);
  const outlierThreshold = options.outlierThreshold ?? 0.42;
  const joinThreshold = outlierThreshold * 0.92;
  const minClusterSize = options.minClusterSize ?? 3;
  const maxClusters = options.k ?? pickClusterCount(pool.length);
  const maxClusterSize = Math.max(minClusterSize + 1, Math.ceil(pool.length / maxClusters) + 2);

  let remaining = pool.map((_, i) => i);
  const clusters: ClusterGroup[] = [];

  while (remaining.length >= minClusterSize && clusters.length < maxClusters) {
    const { core, outliers } = extractCoherentCore(
      remaining,
      vectors,
      joinThreshold,
      outlierThreshold,
      minClusterSize,
      maxClusterSize,
    );

    if (core.length < minClusterSize) break;

    const paletteIdx = clusters.length;
    const palette = CLUSTER_PALETTE[paletteIdx % CLUSTER_PALETTE.length];
    const label = clusterLetter(paletteIdx);

    clusters.push({
      id: `${palette.id}-${label.replace(" ", "-").toLowerCase()}`,
      label,
      color: palette.color,
      bg: palette.bg,
      name: palette.name,
      count: core.length,
      members: core.map((i) => toMember(pool[i])),
      outliers: outliers.length > 0 ? outliers.map((i) => toMember(pool[i])) : undefined,
    });

    const coreSet = new Set(core);
    remaining = remaining.filter((i) => !coreSet.has(i));
  }

  if (remaining.length > 0) {
    if (clusters.length === 0) {
      const palette = CLUSTER_PALETTE[0];
      clusters.push({
        id: `${palette.id}-cluster-a`,
        label: "Cluster A",
        color: palette.color,
        bg: palette.bg,
        name: palette.name,
        count: remaining.length,
        members: remaining.map((i) => toMember(pool[i])),
      });
    } else {
      const centroids = clusters.map((c) => {
        const idx = c.members
          .map((m) => pool.findIndex((s) => s.key === m.key))
          .filter((i) => i >= 0);
        return averageVector(idx.map((i) => vectors[i]));
      });
      for (const i of remaining) {
        let best = 0;
        let bestDist = Infinity;
        for (let c = 0; c < centroids.length; c += 1) {
          const d = vectorDistance(centroids[c], vectors[i]);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
        clusters[best].members.push(toMember(pool[i]));
        clusters[best].count += 1;
      }
    }
  }

  // Re-sort by size for stable palette assignment
  clusters.sort((a, b) => b.count - a.count);
  clusters.forEach((c, i) => {
    c.label = clusterLetter(i);
    const palette = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
    c.id = `${palette.id}-${c.label.replace(" ", "-").toLowerCase()}`;
    c.color = palette.color;
    c.bg = palette.bg;
    c.name = palette.name;
  });

  return buildRunResult("B", year, options, pool, songs.length, clusters, vectors);
}

function extractCoherentCore(
  indices: number[],
  vectors: number[][],
  joinThreshold: number,
  outlierThreshold: number,
  minClusterSize: number,
  maxClusterSize: number,
): { core: number[]; outliers: number[] } {
  if (indices.length === 0) return { core: [], outliers: [] };

  // Hub = song with highest avg similarity to pool slice
  let hubIdx = indices[0];
  let hubScore = -1;
  for (const i of indices) {
    let sum = 0;
    for (const j of indices) {
      if (i === j) continue;
      sum += vectorSimilarity(vectors[i], vectors[j]);
    }
    const avg = sum / Math.max(1, indices.length - 1);
    if (avg > hubScore) {
      hubScore = avg;
      hubIdx = i;
    }
  }

  const core: number[] = [hubIdx];
  const candidates = indices
    .filter((i) => i !== hubIdx)
    .map((i) => ({
      i,
      sim: vectorSimilarity(vectors[hubIdx], vectors[i]),
    }))
    .sort((a, b) => b.sim - a.sim);

  // Grow core: add songs strongly associated with hub, capped
  for (const { i, sim } of candidates) {
    if (core.length >= maxClusterSize) break;
    if (sim < joinThreshold) continue;
    const centroid = averageVector(core.map((x) => vectors[x]));
    const toCentroid = vectorSimilarity(centroid, vectors[i]);
    if (toCentroid >= joinThreshold * 0.95) core.push(i);
  }

  const outliers: number[] = [];

  // Peel outliers from core until coherent
  let changed = true;
  while (changed && core.length > minClusterSize) {
    changed = false;
    let worstIdx = -1;
    let worstSim = Infinity;
    for (const i of core) {
      const others = core.filter((x) => x !== i);
      if (others.length === 0) continue;
      const avgSim =
        others.reduce((s, j) => s + vectorSimilarity(vectors[i], vectors[j]), 0) / others.length;
      if (avgSim < worstSim) {
        worstSim = avgSim;
        worstIdx = i;
      }
    }
    if (worstIdx >= 0 && worstSim < outlierThreshold) {
      core.splice(core.indexOf(worstIdx), 1);
      outliers.push(worstIdx);
      changed = true;
    }
  }

  return { core, outliers };
}
