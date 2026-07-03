import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

import type {
  Top100ValidationProgress,
  Top100ValidationRecentSong,
} from "./top100-validation-progress-types";

export type { Top100ValidationProgress, Top100ValidationRecentSong } from "./top100-validation-progress-types";

export function top100ValidationProgressPath(): string {
  return join(process.cwd(), "reports/intelligence/top100-validation/progress.json");
}

export function emptyTop100ValidationProgress(): Top100ValidationProgress {
  return {
    version: 1,
    status: "idle",
    startedAt: null,
    updatedAt: new Date().toISOString(),
    total: 0,
    completed: 0,
    remaining: 0,
    failures: 0,
    currentSong: null,
    eta: null,
    avgRuntimeMs: null,
    recentCompleted: [],
  };
}

export async function loadTop100ValidationProgress(): Promise<Top100ValidationProgress> {
  try {
    const raw = await readFile(top100ValidationProgressPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Top100ValidationProgress>;
    return {
      ...emptyTop100ValidationProgress(),
      ...parsed,
      recentCompleted: Array.isArray(parsed.recentCompleted) ? parsed.recentCompleted : [],
    };
  } catch {
    return emptyTop100ValidationProgress();
  }
}

export async function saveTop100ValidationProgress(
  progress: Top100ValidationProgress,
): Promise<void> {
  const path = top100ValidationProgressPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

export function computeValidationEta(
  completed: number,
  total: number,
  recentCompleted: Top100ValidationRecentSong[],
): string | null {
  if (completed >= total || total === 0) return null;
  const runtimes = recentCompleted.map((r) => r.runtimeMs).filter((ms) => ms > 0);
  const avgMs =
    runtimes.length > 0
      ? runtimes.reduce((n, ms) => n + ms, 0) / runtimes.length
      : 45_000;
  const remaining = total - completed;
  return new Date(Date.now() + remaining * avgMs).toISOString();
}

export function avgRuntimeMs(recent: Top100ValidationRecentSong[]): number | null {
  const runtimes = recent.map((r) => r.runtimeMs).filter((ms) => ms > 0);
  if (runtimes.length === 0) return null;
  return Math.round(runtimes.reduce((n, ms) => n + ms, 0) / runtimes.length);
}
