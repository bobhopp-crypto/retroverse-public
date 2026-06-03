import { CLUSTER_PALETTE } from "./palette";
import type { VdjPoolSong } from "../types";
import {
  pickClusterCount,
  songFeatureVector,
  vectorDistance,
  vectorSimilarity,
} from "./vectors";
import type { ClusterGroup, ClusterRunOptions, ClusterRunResult } from "./types";
import { dedupePool, toMember } from "./types";
import { buildRunResult } from "./build-result";

const CLUSTER_LETTERS = "ABCDEFGH";

function clusterLetter(index: number): string {
  return `Cluster ${CLUSTER_LETTERS[index] ?? String(index + 1)}`;
}

/**
 * Method C — farthest-first seed selection, then assign to nearest seed by similarity.
 */
export function runMethodC(
  songs: VdjPoolSong[],
  year: number,
  options: ClusterRunOptions,
): ClusterRunResult {
  const pool = dedupePool(songs);
  const vectors = pool.map(songFeatureVector);
  const k = options.seedCount ?? options.k ?? pickClusterCount(pool.length);

  const seedIndices = farthestFirstSeeds(vectors, k);
  const assignments = new Array(pool.length).fill(0);

  for (let i = 0; i < pool.length; i += 1) {
    if (seedIndices.includes(i)) {
      assignments[i] = seedIndices.indexOf(i);
      continue;
    }
    let bestSeed = 0;
    let bestSim = -1;
    for (let s = 0; s < seedIndices.length; s += 1) {
      const sim = vectorSimilarity(vectors[i], vectors[seedIndices[s]]);
      if (sim > bestSim) {
        bestSim = sim;
        bestSeed = s;
      }
    }
    assignments[i] = bestSeed;
  }

  const clusters: ClusterGroup[] = seedIndices.map((seedIdx, paletteIdx) => {
    const palette = CLUSTER_PALETTE[paletteIdx % CLUSTER_PALETTE.length];
    const label = clusterLetter(paletteIdx);
    const memberIdx = pool.map((_, i) => i).filter((i) => assignments[i] === paletteIdx);
    return {
      id: `${palette.id}-${label.replace(" ", "-").toLowerCase()}`,
      label,
      color: palette.color,
      bg: palette.bg,
      name: palette.name,
      count: memberIdx.length,
      seedSong: toMember(pool[seedIdx]),
      members: memberIdx.map((i) => toMember(pool[i])),
    };
  });

  // Sort clusters by size descending for consistent palette order
  clusters.sort((a, b) => b.count - a.count);
  clusters.forEach((c, i) => {
    c.label = clusterLetter(i);
    const palette = CLUSTER_PALETTE[i % CLUSTER_PALETTE.length];
    c.id = `${palette.id}-${c.label.replace(" ", "-").toLowerCase()}`;
    c.color = palette.color;
    c.bg = palette.bg;
    c.name = palette.name;
  });

  return buildRunResult("C", year, options, pool, songs.length, clusters, vectors);
}

/** First seed = cultural hub; subsequent seeds maximally distant from prior seeds. */
function farthestFirstSeeds(vectors: number[][], k: number): number[] {
  const n = Math.min(k, vectors.length);
  if (n === 0) return [];

  // Seed 0: highest average similarity to all others (strong cultural anchor)
  let hub = 0;
  let hubScore = -1;
  for (let i = 0; i < vectors.length; i += 1) {
    let sum = 0;
    for (let j = 0; j < vectors.length; j += 1) {
      if (i === j) continue;
      sum += vectorSimilarity(vectors[i], vectors[j]);
    }
    const avg = sum / Math.max(1, vectors.length - 1);
    if (avg > hubScore) {
      hubScore = avg;
      hub = i;
    }
  }

  const seeds = [hub];
  const used = new Set([hub]);

  while (seeds.length < n) {
    let bestIdx = -1;
    let bestMinDist = -1;
    for (let i = 0; i < vectors.length; i += 1) {
      if (used.has(i)) continue;
      const minDistToSeeds = Math.min(...seeds.map((s) => vectorDistance(vectors[s], vectors[i])));
      if (minDistToSeeds > bestMinDist) {
        bestMinDist = minDistToSeeds;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    seeds.push(bestIdx);
    used.add(bestIdx);
  }

  return seeds;
}
