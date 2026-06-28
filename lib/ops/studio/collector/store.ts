import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";
import { ensureCollectorActivityIds } from "@/lib/ops/studio/pipeline-event-id";

import { collectorOutputPath, collectorProgressPath } from "./paths";
import { normalizeCollectorPackage } from "./presentation";
import {
  COLLECTOR_STAGE_TOTAL,
  type CollectorPackage,
  type CollectorProgress,
} from "./types";

export function emptyCollectorProgress(): CollectorProgress {
  return {
    version: 1,
    status: "idle",
    startedAt: null,
    updatedAt: new Date().toISOString(),
    currentSong: null,
    currentStage: null,
    currentStageLabel: null,
    stageIndex: 0,
    stageTotal: COLLECTOR_STAGE_TOTAL,
    queue: 0,
    completedToday: 0,
    avgRuntimeMs: null,
    researchQuality: null,
    recentActivity: [],
    recentlyCompleted: [],
  };
}

export async function loadCollectorProgress(): Promise<CollectorProgress> {
  const parsed = await readJsonFileSafe<Partial<CollectorProgress> | null>(
    collectorProgressPath(),
    null,
    2000,
  );
  if (!parsed) return emptyCollectorProgress();
  return {
    ...emptyCollectorProgress(),
    ...parsed,
    recentActivity: ensureCollectorActivityIds(
      Array.isArray(parsed.recentActivity) ? parsed.recentActivity : [],
    ),
    recentlyCompleted: Array.isArray(parsed.recentlyCompleted) ? parsed.recentlyCompleted : [],
  };
}

export async function saveCollectorProgress(progress: CollectorProgress): Promise<void> {
  const path = collectorProgressPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export async function loadCollectorPackage(rvtr: string): Promise<CollectorPackage | null> {
  const parsed = await readJsonFileSafe<CollectorPackage | null>(
    collectorOutputPath(rvtr),
    null,
    2000,
  );
  if (!parsed) return null;
  try {
    return normalizeCollectorPackage(parsed);
  } catch {
    return null;
  }
}

export async function saveCollectorPackage(pkg: CollectorPackage): Promise<void> {
  const path = collectorOutputPath(pkg.rvtr);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

export function syntheticRvtrFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").trim().toLowerCase();
  const hash = createHash("sha256").update(normalized).digest("hex");
  const n = parseInt(hash.slice(0, 8), 16) % 1_000_000;
  return `RVTR${String(n).padStart(6, "0")}`;
}

export function newFactId(): string {
  return randomUUID();
}

export function formatAvgRuntime(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 1000)}s`;
}

export function statusLabel(status: CollectorProgress["status"]): string {
  switch (status) {
    case "researching":
      return "Researching";
    case "waiting":
      return "Waiting";
    case "complete":
      return "Complete";
    default:
      return "Idle";
  }
}

export function avgRuntimeMs(
  completed: CollectorProgress["recentlyCompleted"],
): number | null {
  const runtimes = completed.map((c) => c.runtimeMs).filter((ms) => ms > 0);
  if (runtimes.length === 0) return null;
  return Math.round(runtimes.reduce((sum, ms) => sum + ms, 0) / runtimes.length);
}

export function completedTodayCount(
  completed: CollectorProgress["recentlyCompleted"],
): number {
  const today = new Date().toISOString().slice(0, 10);
  return completed.filter((c) => c.completedAt.slice(0, 10) === today).length;
}
