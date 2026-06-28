import "server-only";

import { appendPipelineEvent } from "@/lib/ops/studio/department-status/pipeline-events";
import {
  setDepartmentComplete,
  setDepartmentError,
  setDepartmentRunning,
} from "@/lib/ops/studio/department-status/runtime-progress";
import type { DepartmentLiveSong } from "@/lib/ops/studio/department-status/types";
import type { PipelineTransitionId } from "@/lib/ops/studio/production/pipeline-log";

type RuntimeDepartment = "editor" | "director" | "publisher";

const TRANSITION_DEPARTMENT: Partial<Record<PipelineTransitionId, RuntimeDepartment>> = {
  editor_started: "editor",
  editor_complete: "editor",
  director_started: "director",
  director_complete: "director",
  publisher_started: "publisher",
  publisher_complete: "publisher",
  published: "publisher",
};

const TRANSITION_MESSAGE: Record<PipelineTransitionId, string> = {
  collector_complete: "Collector complete",
  editor_queued: "Editor queued",
  editor_started: "Editor started",
  editor_complete: "Editor complete",
  director_queued: "Director queued",
  director_started: "Director started",
  director_complete: "Director complete",
  publisher_queued: "Publisher queued",
  publisher_started: "Publisher started",
  publisher_complete: "Publisher complete",
  published: "Published",
};

function songFromItem(item: { rvtr: string; artist: string; title: string }): DepartmentLiveSong {
  return { rvtr: item.rvtr, artist: item.artist, title: item.title };
}

export async function syncPipelineTransition(
  transitionId: PipelineTransitionId,
  item: { rvtr: string; artist: string; title: string },
  options?: { detail?: string },
): Promise<void> {
  const department = TRANSITION_DEPARTMENT[transitionId];
  const song = songFromItem(item);
  const message = options?.detail
    ? `${TRANSITION_MESSAGE[transitionId]} — ${options.detail}`
    : `${TRANSITION_MESSAGE[transitionId]} — ${item.title}`;

  const deptForEvent =
    transitionId === "collector_complete"
      ? "collector"
      : department ?? "system";

  await appendPipelineEvent({
    at: new Date().toISOString(),
    department: deptForEvent,
    type: transitionId,
    message,
    rvtr: item.rvtr,
  });

  if (!department) return;

  if (transitionId.endsWith("_started")) {
    await setDepartmentRunning(department, song);
    return;
  }

  if (transitionId === "published" || transitionId.endsWith("_complete")) {
    await setDepartmentComplete(department, song);
  }
}

export async function syncPipelineFailure(
  department: RuntimeDepartment,
  item: { rvtr: string; artist: string; title: string },
  error: string,
): Promise<void> {
  await setDepartmentError(department);
  await appendPipelineEvent({
    at: new Date().toISOString(),
    department,
    type: "error",
    message: `${department} failed — ${item.title}: ${error}`,
    rvtr: item.rvtr,
  });
}
