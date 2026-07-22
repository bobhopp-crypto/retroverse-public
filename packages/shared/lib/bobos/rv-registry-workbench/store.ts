import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { WorkbenchDecision, WorkbenchReview, WorkbenchReviewsFile } from "./types";

const emptyReview = (): WorkbenchReview => ({
  decision: null,
  notes: "",
  viewedAt: null,
  updatedAt: null,
});

export function workbenchDir(): string {
  return join(opsStateDir(), "bobos", "rv-registry-workbench");
}

export function workbenchReviewsPath(): string {
  return join(workbenchDir(), "reviews.json");
}

export function workbenchScreenshotsDir(): string {
  return join(workbenchDir(), "screenshots");
}

export function screenshotPathFor(rvId: string): string {
  const safe = rvId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return join(workbenchScreenshotsDir(), `${safe}.png`);
}

export function screenshotPublicApiPath(rvId: string): string {
  return `/api/bobos/rv-registry-workbench/screenshot?id=${encodeURIComponent(rvId)}`;
}

async function ensureDir(): Promise<void> {
  await mkdir(workbenchDir(), { recursive: true });
  await mkdir(workbenchScreenshotsDir(), { recursive: true });
}

export async function loadWorkbenchReviews(): Promise<WorkbenchReviewsFile> {
  try {
    const raw = await readFile(workbenchReviewsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkbenchReviewsFile>;
    if (!parsed || typeof parsed.reviews !== "object" || !parsed.reviews) {
      return { version: 1, reviews: {} };
    }
    const reviews: Record<string, WorkbenchReview> = {};
    for (const [id, value] of Object.entries(parsed.reviews)) {
      reviews[id] = {
        decision: normalizeDecision(value?.decision),
        notes: typeof value?.notes === "string" ? value.notes : "",
        viewedAt: typeof value?.viewedAt === "string" ? value.viewedAt : null,
        updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
      };
    }
    return { version: 1, reviews };
  } catch {
    return { version: 1, reviews: {} };
  }
}

export async function getWorkbenchReview(rvId: string): Promise<WorkbenchReview> {
  const file = await loadWorkbenchReviews();
  return file.reviews[rvId] ?? emptyReview();
}

export async function upsertWorkbenchReview(
  rvId: string,
  patch: {
    decision?: WorkbenchDecision | null;
    notes?: string;
    viewed?: boolean;
  },
): Promise<WorkbenchReview> {
  await ensureDir();
  const file = await loadWorkbenchReviews();
  const current = file.reviews[rvId] ?? emptyReview();
  const next: WorkbenchReview = {
    decision: patch.decision !== undefined ? patch.decision : current.decision,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    viewedAt:
      patch.viewed === true
        ? new Date().toISOString()
        : patch.viewed === false
          ? null
          : current.viewedAt,
    updatedAt: new Date().toISOString(),
  };
  file.reviews[rvId] = next;
  await writeFile(workbenchReviewsPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return next;
}

function normalizeDecision(value: unknown): WorkbenchDecision | null {
  if (
    value === "keep" ||
    value === "rename" ||
    value === "move" ||
    value === "retire" ||
    value === "review-later"
  ) {
    return value;
  }
  return null;
}
