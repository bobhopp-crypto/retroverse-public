import "server-only";

import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";
import { departmentRuntimeProgressPath } from "@/lib/studio/package";

import type {
  DepartmentLiveSong,
  DepartmentRunStatus,
  DepartmentRuntimeProgressStore,
  DepartmentRuntimeSlot,
  StudioDepartmentId,
} from "./types";

function emptySlot(): DepartmentRuntimeSlot {
  return {
    status: "idle",
    currentSong: null,
    startedAt: null,
    percentComplete: null,
    lastCompletedSong: null,
  };
}

export function emptyRuntimeProgressStore(): DepartmentRuntimeProgressStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    editor: emptySlot(),
    director: emptySlot(),
    publisher: emptySlot(),
  };
}

export async function loadRuntimeProgressStore(): Promise<DepartmentRuntimeProgressStore> {
  const parsed = await readJsonFileSafe<Partial<DepartmentRuntimeProgressStore> | null>(
    departmentRuntimeProgressPath(),
    null,
    2000,
  );
  if (!parsed) return emptyRuntimeProgressStore();
  return {
    ...emptyRuntimeProgressStore(),
    ...parsed,
    editor: { ...emptySlot(), ...parsed.editor },
    director: { ...emptySlot(), ...parsed.director },
    publisher: { ...emptySlot(), ...parsed.publisher },
  };
}

async function saveRuntimeProgressStore(store: DepartmentRuntimeProgressStore): Promise<void> {
  const path = departmentRuntimeProgressPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

type RuntimeDepartmentId = Exclude<StudioDepartmentId, "collector">;

export async function setDepartmentRunning(
  department: RuntimeDepartmentId,
  song: DepartmentLiveSong,
  percentComplete: number | null = null,
): Promise<void> {
  const store = await loadRuntimeProgressStore();
  store[department] = {
    ...store[department],
    status: "running",
    currentSong: song,
    startedAt: new Date().toISOString(),
    percentComplete,
  };
  await saveRuntimeProgressStore(store);
}

export async function setDepartmentIdle(department: RuntimeDepartmentId): Promise<void> {
  const store = await loadRuntimeProgressStore();
  store[department] = {
    ...store[department],
    status: "idle",
    currentSong: null,
    startedAt: null,
    percentComplete: null,
  };
  await saveRuntimeProgressStore(store);
}

export async function setDepartmentComplete(
  department: RuntimeDepartmentId,
  song: DepartmentLiveSong,
): Promise<void> {
  const store = await loadRuntimeProgressStore();
  store[department] = {
    status: "idle",
    currentSong: null,
    startedAt: null,
    percentComplete: null,
    lastCompletedSong: song,
  };
  await saveRuntimeProgressStore(store);
}

export async function setDepartmentError(department: RuntimeDepartmentId): Promise<void> {
  const store = await loadRuntimeProgressStore();
  store[department] = {
    ...store[department],
    status: "error",
    percentComplete: null,
  };
  await saveRuntimeProgressStore(store);
}

export async function getRuntimeSlot(
  department: RuntimeDepartmentId,
): Promise<DepartmentRuntimeSlot> {
  const store = await loadRuntimeProgressStore();
  return store[department];
}
