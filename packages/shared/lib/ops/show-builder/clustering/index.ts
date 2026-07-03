import type { ClusterMethodId, ClusterRunOptions, ClusterRunResult } from "./types";
import type { VdjPoolSong } from "../types";
import { runMethodA } from "./method-a-cultural";
import { runMethodB } from "./method-b-outlier";
import { runMethodC } from "./method-c-seed";

export type ClusterMethod = ClusterMethodId;

export function runClustering(
  method: ClusterMethodId,
  songs: VdjPoolSong[],
  year: number,
  options: ClusterRunOptions,
): ClusterRunResult {
  switch (method) {
    case "A":
      return runMethodA(songs, year, options);
    case "B":
      return runMethodB(songs, year, options);
    case "C":
      return runMethodC(songs, year, options);
    default:
      throw new Error(`Unknown method ${method}`);
  }
}

/** All pass configurations for deep-dive evaluation. */
export function allPassConfigs(): Array<{ method: ClusterMethodId; options: ClusterRunOptions }> {
  const passes: Array<{ method: ClusterMethodId; options: ClusterRunOptions }> = [];

  for (const k of [5, 6, 7]) {
    passes.push({
      method: "A",
      options: { passId: `k${k}-merge3`, k, mergeMinSize: 3, mergeMinClusters: 5 },
    });
  }
  passes.push({
    method: "A",
    options: { passId: "k7-merge2", k: 7, mergeMinSize: 2, mergeMinClusters: 4 },
  });
  passes.push({
    method: "A",
    options: { passId: "k6-merge4", k: 6, mergeMinSize: 4, mergeMinClusters: 5 },
  });

  for (const threshold of [0.38, 0.42, 0.46, 0.5]) {
    passes.push({
      method: "B",
      options: {
        passId: `outlier-${threshold.toFixed(2)}`,
        outlierThreshold: threshold,
        minClusterSize: 3,
        k: 7,
      },
    });
  }
  passes.push({
    method: "B",
    options: {
      passId: "outlier-0.42-min4",
      outlierThreshold: 0.42,
      minClusterSize: 4,
      k: 6,
    },
  });

  for (const k of [5, 6, 7, 8]) {
    passes.push({
      method: "C",
      options: { passId: `seeds-${k}`, seedCount: k, k },
    });
  }
  passes.push({
    method: "C",
    options: { passId: "seeds-6-alt", seedCount: 6, k: 6 },
  });

  return passes;
}

export { runMethodA } from "./method-a-cultural";
export { runMethodB } from "./method-b-outlier";
export { runMethodC } from "./method-c-seed";
export { scoreRun, formatScores, YEAR_ANCHORS } from "./evaluate";
export type { ClusterRunResult, ClusterRunOptions, ClusterMethodId } from "./types";
