import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";

import {
  TRAINING_REVIEW_VERSION,
  type SpotReviewBatch,
  type TrainingDepartmentId,
  type TrainingReviewRecord,
  type TrainingReviewStore,
  type TrainingReviewVerdict,
} from "./types";

function trainingStorePath(): string {
  return join(bundledIntelligenceRoot(), "..", "studio", "training-reviews.json");
}

function emptyStore(): TrainingReviewStore {
  return {
    version: TRAINING_REVIEW_VERSION,
    updatedAt: new Date().toISOString(),
    reviews: [],
    spotReviews: [],
  };
}

export async function loadTrainingReviewStore(): Promise<TrainingReviewStore> {
  try {
    const raw = await readFile(trainingStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<TrainingReviewStore>;
    return {
      ...emptyStore(),
      ...parsed,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      spotReviews: Array.isArray(parsed.spotReviews) ? parsed.spotReviews : [],
    };
  } catch {
    return emptyStore();
  }
}

async function saveTrainingReviewStore(store: TrainingReviewStore): Promise<void> {
  const path = trainingStorePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export async function saveTrainingReview(input: {
  rvtr: string;
  department: TrainingDepartmentId;
  verdict: TrainingReviewVerdict;
  note?: string | null;
}): Promise<TrainingReviewRecord> {
  const store = await loadTrainingReviewStore();
  const record: TrainingReviewRecord = {
    rvtr: input.rvtr.trim().toUpperCase(),
    department: input.department,
    verdict: input.verdict,
    note: input.note?.trim() || null,
    reviewedAt: new Date().toISOString(),
  };

  store.reviews = store.reviews.filter(
    (r) => !(r.rvtr === record.rvtr && r.department === record.department),
  );
  store.reviews.push(record);
  await saveTrainingReviewStore(store);
  return record;
}

export async function getLatestReview(
  rvtr: string,
  department: TrainingDepartmentId,
): Promise<TrainingReviewRecord | null> {
  const store = await loadTrainingReviewStore();
  const normalized = rvtr.trim().toUpperCase();
  return (
    store.reviews
      .filter((r) => r.rvtr === normalized && r.department === department)
      .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0] ?? null
  );
}

export async function appendSpotReviewBatch(batch: SpotReviewBatch): Promise<void> {
  const store = await loadTrainingReviewStore();
  store.spotReviews.unshift(batch);
  store.spotReviews = store.spotReviews.slice(0, 50);
  await saveTrainingReviewStore(store);
}

export async function listSpotReviewBatches(): Promise<SpotReviewBatch[]> {
  const store = await loadTrainingReviewStore();
  return store.spotReviews;
}
