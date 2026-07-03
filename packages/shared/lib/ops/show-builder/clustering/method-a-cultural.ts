import { CLUSTER_PALETTE } from "./palette";
import type { VdjPoolSong } from "../types";
import {
  averageVector,
  pickClusterCount,
  songFeatureVector,
  vectorDistance,
} from "./vectors";
import type { ClusterGroup, ClusterMemberSong, ClusterRunOptions, ClusterRunResult } from "./types";
import { dedupePool, toMember } from "./types";
import { buildRunResult } from "./build-result";

const CLUSTER_LETTERS = "ABCDEFGH";

function clusterLetter(index: number): string {
  return `Cluster ${CLUSTER_LETTERS[index] ?? String(index + 1)}`;
}

function clusterCentroid(vectors: number[][], assignments: number[], clusterId: number): number[] {
  const members = vectors.filter((_, i) => assignments[i] === clusterId);
  return averageVector(members);
}

function mergeSmallClusters(
  vectors: number[][],
  assignments: number[],
  minSize: number,
  minClusters: number,
): number[] {
  let next = [...assignments];

  while (true) {
    const sizes = new Map<number, number>();
    for (const a of next) sizes.set(a, (sizes.get(a) ?? 0) + 1);
    if (sizes.size <= minClusters) break;

    let mergeFrom = -1;
    let mergeSize = Infinity;
    for (const [clusterId, size] of sizes) {
      if (size < minSize && size < mergeSize) {
        mergeSize = size;
        mergeFrom = clusterId;
      }
    }
    if (mergeFrom < 0) break;

    const fromCentroid = clusterCentroid(vectors, next, mergeFrom);
    let mergeInto = -1;
    let bestDist = Infinity;
    for (const clusterId of sizes.keys()) {
      if (clusterId === mergeFrom) continue;
      const d = vectorDistance(fromCentroid, clusterCentroid(vectors, next, clusterId));
      if (d < bestDist) {
        bestDist = d;
        mergeInto = clusterId;
      }
    }
    if (mergeInto < 0) break;
    next = next.map((a) => (a === mergeFrom ? mergeInto : a));
  }

  return next;
}

function kMeansAssign(vectors: number[][], k: number): number[] {
  if (vectors.length === 0) return [];
  const kClamped = Math.min(k, vectors.length);
  const centroids: number[][] = [];
  const used = new Set<number>();
  centroids.push([...vectors[0]]);
  used.add(0);
  while (centroids.length < kClamped) {
    let bestIdx = -1;
    let bestDist = -1;
    for (let i = 0; i < vectors.length; i += 1) {
      if (used.has(i)) continue;
      const nearest = Math.min(...centroids.map((c) => vectorDistance(c, vectors[i])));
      if (nearest > bestDist) {
        bestDist = nearest;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    centroids.push([...vectors[bestIdx]]);
    used.add(bestIdx);
  }

  const assignments = new Array(vectors.length).fill(0);
  for (let iter = 0; iter < 16; iter += 1) {
    for (let i = 0; i < vectors.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c += 1) {
        const d = vectorDistance(centroids[c], vectors[i]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }
    for (let c = 0; c < centroids.length; c += 1) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length > 0) centroids[c] = averageVector(members);
    }
  }
  return assignments;
}

function assignmentsToGroups(
  songs: VdjPoolSong[],
  assignments: number[],
): ClusterGroup[] {
  const groups = new Map<number, number[]>();
  for (let i = 0; i < assignments.length; i += 1) {
    const g = assignments[i];
    const list = groups.get(g) ?? [];
    list.push(i);
    groups.set(g, list);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  return sortedGroups.map(([, memberIdx], paletteIdx) => {
    const palette = CLUSTER_PALETTE[paletteIdx % CLUSTER_PALETTE.length];
    const label = clusterLetter(paletteIdx);
    return {
      id: `${palette.id}-${label.replace(" ", "-").toLowerCase()}`,
      label,
      color: palette.color,
      bg: palette.bg,
      name: palette.name,
      count: memberIdx.length,
      members: memberIdx.map((i) => toMember(songs[i])),
    };
  });
}

/** Method A — cultural association vectors + k-means + optional merge. */
export function runMethodA(
  songs: VdjPoolSong[],
  year: number,
  options: ClusterRunOptions,
): ClusterRunResult {
  const pool = dedupePool(songs);
  const vectors = pool.map(songFeatureVector);
  const k = options.k ?? pickClusterCount(pool.length);
  let assignments = kMeansAssign(vectors, k);
  assignments = mergeSmallClusters(
    vectors,
    assignments,
    options.mergeMinSize ?? 3,
    options.mergeMinClusters ?? 5,
  );
  const clusters = assignmentsToGroups(pool, assignments);
  return buildRunResult("A", year, options, pool, songs.length, clusters, vectors);
}
