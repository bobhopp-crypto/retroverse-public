import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  buildRepairBatchRows,
  repairBatchToCsv,
  type RepairBatchRow,
} from "@/lib/cover-integrity/repair-batch";
import {
  loadRepairBatchCsv,
  type RepairBatchCsvRow,
} from "@/lib/cover-integrity/load-repair-batch-csv";
import { loadHashMatchIndexForBatch } from "@/lib/cover-integrity/load-cover-audit-csv";
import {
  buildPathToHashIndex,
  filterActionableTrainingRows,
} from "@/lib/cover-integrity/training-display";
import { loadTrainingWeights, applyTrainingScoreAdjustments } from "@/lib/cover-integrity/training-weights";
import { runCoverIntegrityAudit } from "@/lib/cover-integrity/run-audit";
import { buildRepairQueue } from "@/lib/cover-integrity/repair-queue";
import { reviewedRvalSet, loadTrainingDecisions } from "@/lib/rv12/training-decisions";

export const TRAINING_BATCH_SIZE = 10;

export type TrainingBatchManifest = {
  batchId: string;
  csvFile: string;
  rvals: string[];
  size: number;
  generatedAt: string;
  excludedReviewed: number;
};

export function trainingBatchManifestPath(): string {
  return join(process.cwd(), "reports/cover_integrity/training_batch_current.json");
}

export function repairBatchCsvPath(batchId: string): string {
  return join(process.cwd(), "reports/cover_integrity", `repair_batch_${batchId}.csv`);
}

export async function loadTrainingBatchManifest(): Promise<TrainingBatchManifest | null> {
  try {
    const raw = await readFile(trainingBatchManifestPath(), "utf8");
    return JSON.parse(raw) as TrainingBatchManifest;
  } catch {
    return null;
  }
}

export async function saveTrainingBatchManifest(manifest: TrainingBatchManifest): Promise<void> {
  await mkdir(join(process.cwd(), "reports/cover_integrity"), { recursive: true });
  await writeFile(trainingBatchManifestPath(), JSON.stringify(manifest, null, 2));
}

const EMPTY_TRAINING_MANIFEST: TrainingBatchManifest = {
  batchId: "000",
  csvFile: "",
  rvals: [],
  size: 0,
  generatedAt: "",
  excludedReviewed: 0,
};

export async function loadTrainingBatchRows(): Promise<{
  manifest: TrainingBatchManifest;
  rows: RepairBatchCsvRow[];
  emptyPool: boolean;
}> {
  const manifest = await loadTrainingBatchManifest();
  if (!manifest || manifest.rvals.length === 0) {
    return {
      manifest: manifest ?? EMPTY_TRAINING_MANIFEST,
      rows: [],
      emptyPool: true,
    };
  }

  const csvPath = join(process.cwd(), "reports/cover_integrity", manifest.csvFile);
  const allRows = await loadRepairBatchCsv(csvPath);
  const byRval = new Map(allRows.map((r) => [r.rval, r]));
  const rows = manifest.rvals
    .map((id) => byRval.get(id))
    .filter((r): r is RepairBatchCsvRow => !!r);

  return { manifest, rows, emptyPool: false };
}

export async function generateNextTrainingBatch(): Promise<TrainingBatchManifest> {
  const training = await loadTrainingDecisions();
  const reviewed = reviewedRvalSet(training);
  const weights = await loadTrainingWeights();

  const { rows: scored } = await runCoverIntegrityAudit();
  const queue = buildRepairQueue(scored);
  const queueRvals = new Set(queue.map((q) => q.rval));

  const candidates = scored
    .filter((r) => queueRvals.has(r.rval) && r.canonicalPath?.trim())
    .map((row) => {
      const q = queue.find((x) => x.rval === row.rval)!;
      const trainDelta = applyTrainingScoreAdjustments(row, weights, reviewed);
      return {
        row,
        score: q.repairPriority + trainDelta,
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const pool = candidates.slice(0, 150).map((x) => x.row);
  const actionable: Awaited<ReturnType<typeof buildRepairBatchRows>> = [];

  for (let offset = 0; offset < pool.length && actionable.length < TRAINING_BATCH_SIZE; offset += 25) {
    const chunk = pool.slice(offset, offset + 25);
    if (chunk.length === 0) break;

    const built = await buildRepairBatchRows(chunk, scored);
    const hashes = built.map((r) => r.currentHash).filter((h): h is string => !!h);
    const hashMatches = await loadHashMatchIndexForBatch(hashes);
    const pathToHash = buildPathToHashIndex(built, hashMatches);
    const { actionable: chunkActionable } = filterActionableTrainingRows(
      built,
      hashMatches,
      pathToHash,
    );

    for (const row of chunkActionable) {
      if (reviewed.has(row.rval)) continue;
      if (actionable.some((a) => a.rval === row.rval)) continue;
      actionable.push(row);
      if (actionable.length >= TRAINING_BATCH_SIZE) break;
    }
  }

  const batchRows = actionable.slice(0, TRAINING_BATCH_SIZE);

  const prev = await loadTrainingBatchManifest();
  const nextNum = prev ? Number(prev.batchId) + 1 : 2;
  const batchId = String(nextNum).padStart(3, "0");

  const csvFile = `repair_batch_${batchId}.csv`;
  const csvPath = repairBatchCsvPath(batchId);
  await mkdir(join(process.cwd(), "reports/cover_integrity"), { recursive: true });
  await writeFile(csvPath, repairBatchToCsv(batchRows));

  const manifest: TrainingBatchManifest = {
    batchId,
    csvFile,
    rvals: batchRows.map((r) => r.rval),
    size: batchRows.length,
    generatedAt: new Date().toISOString(),
    excludedReviewed: reviewed.size,
  };
  await saveTrainingBatchManifest(manifest);
  return manifest;
}
