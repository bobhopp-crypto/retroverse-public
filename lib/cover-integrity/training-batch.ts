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

export async function loadTrainingBatchRows(): Promise<{
  manifest: TrainingBatchManifest;
  rows: RepairBatchCsvRow[];
}> {
  let manifest = await loadTrainingBatchManifest();
  if (!manifest) {
    manifest = {
      batchId: "001",
      csvFile: "repair_batch_001.csv",
      rvals: [],
      size: TRAINING_BATCH_SIZE,
      generatedAt: new Date().toISOString(),
      excludedReviewed: 0,
    };
    const all = await loadRepairBatchCsv(
      join(process.cwd(), "reports/cover_integrity/repair_batch_001.csv"),
    );
    const training = await loadTrainingDecisions();
    const reviewed = reviewedRvalSet(training);
    manifest.rvals = all
      .filter((r) => !reviewed.has(r.rval))
      .slice(0, TRAINING_BATCH_SIZE)
      .map((r) => r.rval);
    await saveTrainingBatchManifest(manifest);
  }

  const csvPath = join(process.cwd(), "reports/cover_integrity", manifest.csvFile);
  const allRows = await loadRepairBatchCsv(csvPath);
  const byRval = new Map(allRows.map((r) => [r.rval, r]));
  const rows = manifest.rvals
    .map((id) => byRval.get(id))
    .filter((r): r is RepairBatchCsvRow => !!r);

  return { manifest, rows };
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

  const picked = candidates.slice(0, TRAINING_BATCH_SIZE).map((x) => x.row);

  const prev = await loadTrainingBatchManifest();
  const nextNum = prev ? Number(prev.batchId) + 1 : 2;
  const batchId = String(nextNum).padStart(3, "0");

  const batchRows = await buildRepairBatchRows(picked, scored);
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
