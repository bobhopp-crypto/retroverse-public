import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import type {
  IntelligenceRunProgress,
  IntelligenceRunRecentSong,
} from "./run-progress-types";

export type { IntelligenceRunProgress, IntelligenceRunRecentSong } from "./run-progress-types";

export const OVERNIGHT_COHORT_LIMIT = 500;
export const OVERNIGHT_RUN_ID = "current";

export function intelligenceRunProgressPath(runId = OVERNIGHT_RUN_ID): string {
  return join(process.cwd(), "reports/intelligence/runs", runId, "progress.json");
}

export function emptyIntelligenceRunProgress(
  cohortLimit = OVERNIGHT_COHORT_LIMIT,
): IntelligenceRunProgress {
  return {
    version: 1,
    runId: OVERNIGHT_RUN_ID,
    label: "Overnight Intelligence Build",
    cohortLimit,
    status: "idle",
    startedAt: null,
    updatedAt: new Date().toISOString(),
    total: 0,
    completed: 0,
    remaining: 0,
    successes: 0,
    failures: 0,
    currentSong: null,
    eta: null,
    avgRuntimeMs: null,
    recentCompleted: [],
  };
}

export async function loadIntelligenceRunProgress(
  runId = OVERNIGHT_RUN_ID,
): Promise<IntelligenceRunProgress> {
  try {
    const raw = await readFile(intelligenceRunProgressPath(runId), "utf8");
    const parsed = JSON.parse(raw) as Partial<IntelligenceRunProgress>;
    return {
      ...emptyIntelligenceRunProgress(parsed.cohortLimit ?? OVERNIGHT_COHORT_LIMIT),
      ...parsed,
      recentCompleted: Array.isArray(parsed.recentCompleted) ? parsed.recentCompleted : [],
    };
  } catch {
    return emptyIntelligenceRunProgress();
  }
}

export async function saveIntelligenceRunProgress(
  progress: IntelligenceRunProgress,
  runId = OVERNIGHT_RUN_ID,
): Promise<void> {
  const path = intelligenceRunProgressPath(runId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export function computeRunEta(
  completed: number,
  total: number,
  recentCompleted: IntelligenceRunRecentSong[],
): string | null {
  if (completed >= total || total === 0) return null;
  const runtimes = recentCompleted.map((r) => r.runtimeMs).filter((ms) => ms > 0);
  const avgMs =
    runtimes.length > 0
      ? runtimes.reduce((n, ms) => n + ms, 0) / runtimes.length
      : 60_000;
  const remaining = total - completed;
  return new Date(Date.now() + remaining * avgMs).toISOString();
}

export function avgRunRuntimeMs(recent: IntelligenceRunRecentSong[]): number | null {
  const runtimes = recent.map((r) => r.runtimeMs).filter((ms) => ms > 0);
  if (runtimes.length === 0) return null;
  return Math.round(runtimes.reduce((n, ms) => n + ms, 0) / runtimes.length);
}
