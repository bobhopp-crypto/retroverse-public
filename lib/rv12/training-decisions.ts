import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export type CoverTrainingDecisionValue = "correct" | "wrong" | "unsure" | "needs_pull";

export type CoverTrainingDecision = {
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  currentHash: string | null;
  proposedHash: string | null;
  proposedSource: string | null;
  decision: CoverTrainingDecisionValue;
  confidence: "high" | "medium" | "low";
  reason: string;
  timestamp: string;
};

export type CoverTrainingStore = {
  version: 1;
  updatedAt: string;
  entries: CoverTrainingDecision[];
  byRval: Record<string, CoverTrainingDecision>;
};

export function trainingDecisionsPath(root = process.cwd()): string {
  const override = process.env.COVER_TRAINING_DECISIONS_PATH?.trim();
  if (override) return override;
  return join(retroverseDataRoot(), "ops", "rv12", "training_decisions.json");
}

export async function loadTrainingDecisions(): Promise<CoverTrainingStore> {
  const path = trainingDecisionsPath();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as CoverTrainingStore;
    if (parsed?.byRval && parsed.entries) return parsed;
  } catch {
    // missing
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: [],
    byRval: {},
  };
}

export async function saveTrainingDecision(
  decision: Omit<CoverTrainingDecision, "timestamp"> & { timestamp?: string },
): Promise<CoverTrainingDecision> {
  const store = await loadTrainingDecisions();
  const row: CoverTrainingDecision = {
    ...decision,
    rval: decision.rval.toUpperCase(),
    timestamp: decision.timestamp ?? new Date().toISOString(),
  };
  store.entries.push(row);
  store.byRval[row.rval] = row;
  store.updatedAt = row.timestamp;

  const path = trainingDecisionsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2));
  return row;
}

export function reviewedRvalSet(store: CoverTrainingStore): Set<string> {
  return new Set(Object.keys(store.byRval));
}
