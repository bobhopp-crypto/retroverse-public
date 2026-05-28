import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { isCompilationCluster } from "@/lib/cover-integrity/propose-candidate";
import type { CoverTrainingDecision, CoverTrainingStore } from "@/lib/rv12/training-decisions";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";
import type { ScoredCoverWithTrust } from "@/lib/cover-integrity/trust-tier";

export type TrainingWeights = {
  version: 1;
  generatedAt: string;
  decisionCount: number;
  excludedRvals: string[];
  sameArtistWrongBoost: number;
  compilationDownrank: number;
  confirmedCorrectDownrank: number;
  needsPullBoost: number;
  wrongPatternBoost: number;
};

export function trainingWeightsPath(): string {
  return join(retroverseDataRoot(), "ops", "rv12", "training_weights.json");
}

export function buildTrainingWeights(store: CoverTrainingStore): TrainingWeights {
  let sameArtistWrong = 0;
  let compilationCorrect = 0;
  let needsPull = 0;
  let wrongGeneric = 0;

  for (const d of store.entries) {
    if (d.decision === "wrong" && d.reason.includes("same_artist")) sameArtistWrong += 1;
    if (d.decision === "correct" && /various|now \d|compilation/i.test(`${d.artist} ${d.album}`)) {
      compilationCorrect += 1;
    }
    if (d.decision === "needs_pull") needsPull += 1;
    if (d.decision === "wrong") wrongGeneric += 1;
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    decisionCount: store.entries.length,
    excludedRvals: Object.entries(store.byRval)
      .filter(([, d]) => d.decision === "correct")
      .map(([rval]) => rval),
    sameArtistWrongBoost: 400 + sameArtistWrong * 120,
    compilationDownrank: 600 + compilationCorrect * 80,
    confirmedCorrectDownrank: 2500,
    needsPullBoost: 300 + needsPull * 40,
    wrongPatternBoost: 200 + wrongGeneric * 30,
  };
}

export async function writeTrainingWeights(weights: TrainingWeights): Promise<string> {
  const path = trainingWeightsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(weights, null, 2));
  return path;
}

export async function loadTrainingWeights(): Promise<TrainingWeights | null> {
  try {
    const raw = await readFile(trainingWeightsPath(), "utf8");
    return JSON.parse(raw) as TrainingWeights;
  } catch {
    return null;
  }
}

export function applyTrainingScoreAdjustments(
  row: ScoredCoverWithTrust,
  weights: TrainingWeights | null,
  reviewed: Set<string>,
): number {
  let delta = 0;
  if (reviewed.has(row.rval)) return -99999;

  if (weights) {
    if (weights.excludedRvals.includes(row.rval)) {
      return -99999;
    }
    if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) {
      delta += weights.sameArtistWrongBoost;
    }
    if (isCompilationCluster(row)) {
      delta -= weights.compilationDownrank;
    }
    if (row.suspicionReasons.some((s) => s.includes("discogs") || s.includes("title"))) {
      delta += 40;
    }
  }

  if (row.b200Peak != null && row.b200Peak <= 10) delta += 150;
  if (row.trustTier === "BROKEN") delta += 400;
  if (row.trustTier === "HIGH_RISK") delta += 200;

  return delta;
}

export function trainingReasonForRow(row: ScoredCoverWithTrust): string {
  if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) {
    return "same_artist_hash_collision";
  }
  if (isCompilationCluster(row)) return "compilation_cluster";
  if (!row.fileExists) return "missing_file";
  return row.suspicionReasons[0] ?? "audit_flag";
}
