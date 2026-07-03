import "server-only";

import { cache } from "react";

import {
  completedTodayCount,
  loadCollectorProgress,
} from "@/lib/ops/studio/collector/store";
import type { CollectorRunStatus } from "@/lib/ops/studio/collector/types";

import { getDepartmentQueueIndexCached } from "./queue-index";
import { getRuntimeSlot } from "./runtime-progress";
import type {
  DepartmentLiveSong,
  DepartmentLiveStatus,
  DepartmentRunStatus,
  StudioDepartmentId,
  StudioMissionControlPayload,
} from "./types";
import { loadStudioActivityFeed } from "./pipeline-events";

function mapCollectorStatus(status: CollectorRunStatus): DepartmentRunStatus {
  switch (status) {
    case "researching":
      return "running";
    case "waiting":
      return "waiting";
    default:
      return "idle";
  }
}

function resolveCurrentSong(
  runtimeSong: DepartmentLiveSong | null,
  nextInQueue: DepartmentLiveSong | null,
): DepartmentLiveSong | null {
  return runtimeSong ?? nextInQueue;
}

export async function loadCollectorLiveStatus(): Promise<DepartmentLiveStatus> {
  const [progress, queueIndex] = await Promise.all([
    loadCollectorProgress(),
    getDepartmentQueueIndexCached(),
  ]);

  const lastCompleted = progress.recentlyCompleted[0];
  const currentSong = progress.currentSong
    ? {
        rvtr: progress.currentSong.rvtr,
        artist: progress.currentSong.artist,
        title: progress.currentSong.title,
        subtitle: progress.currentStageLabel ?? undefined,
      }
    : queueIndex.collector.nextInQueue;

  return {
    department: "collector",
    generatedAt: new Date().toISOString(),
    status: mapCollectorStatus(progress.status),
    currentSong,
    queueRemaining: progress.queue,
    completedCount: queueIndex.collector.complete,
    completedToday: completedTodayCount(progress.recentlyCompleted),
    lastCompletedSong: lastCompleted
      ? {
          rvtr: lastCompleted.rvtr,
          artist: lastCompleted.artist,
          title: lastCompleted.title,
        }
      : null,
    startedAt: progress.startedAt,
    percentComplete:
      progress.stageTotal > 0
        ? Math.round((progress.stageIndex / progress.stageTotal) * 100)
        : null,
    packageTotal: queueIndex.collector.complete,
  };
}

async function loadRuntimeDepartmentStatus(
  department: Exclude<StudioDepartmentId, "collector">,
): Promise<DepartmentLiveStatus> {
  const [runtime, queueIndex] = await Promise.all([
    getRuntimeSlot(department),
    getDepartmentQueueIndexCached(),
  ]);

  const deptQueue = queueIndex[department];
  const currentSong = resolveCurrentSong(runtime.currentSong, deptQueue.nextInQueue);

  return {
    department,
    generatedAt: new Date().toISOString(),
    status: runtime.status,
    currentSong,
    queueRemaining: deptQueue.waiting,
    completedCount: deptQueue.complete,
    completedToday: deptQueue.complete,
    lastCompletedSong: runtime.lastCompletedSong,
    startedAt: runtime.startedAt,
    percentComplete: runtime.percentComplete,
    packageTotal: department === "publisher" ? queueIndex.publisher.evaluated : deptQueue.complete,
    publishedCount:
      department === "publisher" ? queueIndex.publisher.approved : undefined,
  };
}

export async function loadEditorLiveStatus(): Promise<DepartmentLiveStatus> {
  return loadRuntimeDepartmentStatus("editor");
}

export async function loadDirectorLiveStatus(): Promise<DepartmentLiveStatus> {
  return loadRuntimeDepartmentStatus("director");
}

export async function loadPublisherLiveStatus(): Promise<DepartmentLiveStatus> {
  const status = await loadRuntimeDepartmentStatus("publisher");
  return {
    ...status,
    completedCount: status.publishedCount ?? status.completedCount,
    completedToday: status.publishedCount ?? status.completedCount,
  };
}

const STATUS_LOADERS: Record<StudioDepartmentId, () => Promise<DepartmentLiveStatus>> = {
  collector: loadCollectorLiveStatus,
  editor: loadEditorLiveStatus,
  director: loadDirectorLiveStatus,
  publisher: loadPublisherLiveStatus,
};

export async function loadDepartmentLiveStatus(
  department: StudioDepartmentId,
): Promise<DepartmentLiveStatus> {
  return STATUS_LOADERS[department]();
}

export async function loadAllDepartmentLiveStatuses(): Promise<
  Record<StudioDepartmentId, DepartmentLiveStatus>
> {
  const [collector, editor, director, publisher] = await Promise.all([
    loadCollectorLiveStatus(),
    loadEditorLiveStatus(),
    loadDirectorLiveStatus(),
    loadPublisherLiveStatus(),
  ]);
  return { collector, editor, director, publisher };
}

export const getAllDepartmentLiveStatusesCached = cache(loadAllDepartmentLiveStatuses);

export async function loadMissionControlPayload(): Promise<StudioMissionControlPayload> {
  const [departments, activity, queueIndex] = await Promise.all([
    loadAllDepartmentLiveStatuses(),
    loadStudioActivityFeed(20),
    getDepartmentQueueIndexCached(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    departments,
    activity,
    queueIndex,
  };
}

export const getMissionControlPayloadCached = cache(loadMissionControlPayload);
