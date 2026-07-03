import "server-only";

import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import { exhibitIdFromScene } from "@/lib/ops/studio/director/exhibit-plan";

import type { ExperienceFingerprint } from "./types";
import { EXPERIENCE_FINGERPRINTS } from "./types";

export type ExperienceVector = {
  rvtr: string;
  values: number[];
};

const SCENE_TYPES = [
  "hero",
  "story",
  "timeline",
  "quote",
  "performance",
  "chart",
  "image",
  "closing",
] as const;

/** Build a numeric fingerprint vector for similarity comparison. */
export function buildExperienceVector(
  rvtr: string,
  director: DirectorPackage,
  fingerprints: ExperienceFingerprint[],
): ExperienceVector {
  const scenes = director.experiencePlan.scenes;
  const values: number[] = [];

  for (const fp of EXPERIENCE_FINGERPRINTS) {
    values.push(fingerprints.includes(fp) ? 1 : 0);
  }

  for (const type of SCENE_TYPES) {
    values.push(scenes.filter((s) => s.sceneType === type).length / Math.max(scenes.length, 1));
  }

  const exhibitOrder = ["cover", "chart_journey", "iconic_moment", "song_dna", "performance"];
  for (const exhibit of exhibitOrder) {
    values.push(scenes.some((s) => exhibitIdFromScene(s) === exhibit) ? 1 : 0);
  }

  const imageIds = scenes.flatMap((s) => s.linkedImageAssetIds);
  const uniqueRatio =
    imageIds.length > 0 ? new Set(imageIds).size / imageIds.length : 1;
  values.push(uniqueRatio);

  const textDensity =
    scenes.reduce((n, s) => n + s.headline.length + s.supportingCopy.length, 0) /
    Math.max(scenes.length, 1);
  values.push(Math.min(1, textDensity / 120));

  values.push(scenes.length / 16);

  return { rvtr, values };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function computeSimilarity(a: ExperienceVector, b: ExperienceVector): number {
  return Math.round(cosineSimilarity(a.values, b.values) * 100);
}

export function uniquenessFromSimilarities(similarities: number[]): number {
  if (similarities.length === 0) return 100;
  const maxSim = Math.max(...similarities);
  return Math.max(0, Math.min(100, 100 - maxSim));
}

export function findSimilarExperiences(
  target: ExperienceVector,
  catalog: ExperienceVector[],
  limit = 5,
): Array<{ rvtr: string; similarity: number }> {
  return catalog
    .filter((entry) => entry.rvtr !== target.rvtr)
    .map((entry) => ({
      rvtr: entry.rvtr,
      similarity: computeSimilarity(target, entry),
    }))
    .filter((row) => row.similarity >= 55)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
