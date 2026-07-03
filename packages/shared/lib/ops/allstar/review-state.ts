import "server-only";

import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";

import { allstarExtractorOutputDir } from "./paths";

export type ReviewStatus = "pending" | "accepted" | "correct" | "skipped";

export type ReviewItem = {
  discId: string;
  status: ReviewStatus;
  reviewedAt: string | null;
  note?: string;
};

export type ReviewState = {
  updatedAt: string;
  items: Record<string, ReviewItem>;
};

function reviewStatePath(): string {
  return `${allstarExtractorOutputDir()}/review-state.json`;
}

export async function loadReviewState(): Promise<ReviewState> {
  const path = reviewStatePath();
  if (!existsSync(path)) {
    return { updatedAt: new Date().toISOString(), items: {} };
  }
  try {
    return JSON.parse(await readFile(path, "utf8")) as ReviewState;
  } catch {
    return { updatedAt: new Date().toISOString(), items: {} };
  }
}

export async function saveReviewState(state: ReviewState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await writeFile(reviewStatePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function setReviewStatus(
  discId: string,
  status: ReviewStatus,
  note?: string,
): Promise<ReviewState> {
  const state = await loadReviewState();
  state.items[discId] = {
    discId,
    status,
    reviewedAt: new Date().toISOString(),
    note,
  };
  await saveReviewState(state);
  return state;
}
