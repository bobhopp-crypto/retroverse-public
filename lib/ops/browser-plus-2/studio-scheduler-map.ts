/**
 * Browser+ 2 — queue department → worker registry mapping (no server imports).
 */

import type { StudioDepartmentWorkerId } from "@/lib/studio/worker";

import type { Bp2StudioQueueDepartment } from "./types";

export type QueueWorkerResolution = {
  workerId: StudioDepartmentWorkerId;
  action: string;
};

export function resolveQueueWorker(
  department: Bp2StudioQueueDepartment,
): QueueWorkerResolution | null {
  switch (department) {
    case "run-collector":
      return { workerId: "collector", action: "run" };
    case "run-editor":
      return { workerId: "editor", action: "draft" };
    case "run-director":
    case "rebuild-experience":
      return { workerId: "director", action: "run" };
    case "refresh-research":
      return { workerId: "research", action: "refresh" };
    default:
      return null;
  }
}
