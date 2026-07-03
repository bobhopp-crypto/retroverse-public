/**
 * Browser+ 2 — scheduler queries for worker capability profiles (read-only).
 *
 * Does not change queue routing — introspection only until intelligent scheduling lands.
 */

import type { WorkerCapabilityProfile, WorkerProfileQuery } from "@/lib/studio/worker-profile";

import {
  getWorkerCapabilityProfile,
  queryWorkerProfiles,
} from "@/lib/ops/studio/workers/profile-registry";

import type { Bp2StudioQueueDepartment } from "./types";
import { resolveQueueWorker } from "./studio-scheduler-map";

export type { WorkerCapabilityProfile, WorkerProfileQuery } from "@/lib/studio/worker-profile";

/** Capability profile for a queue department's target worker. */
export function getQueueDepartmentProfile(
  department: Bp2StudioQueueDepartment,
): WorkerCapabilityProfile | null {
  const resolution = resolveQueueWorker(department);
  if (!resolution) return null;
  return getWorkerCapabilityProfile(resolution.workerId);
}

/** Query profiles relevant to Browser+ queue departments. */
export function queryQueueWorkerProfiles(
  query: WorkerProfileQuery = {},
): WorkerCapabilityProfile[] {
  return queryWorkerProfiles(query);
}

export {
  planQueueDepartmentStep,
  planQueueDepartmentStepDetailed,
  planQueueJob,
  planQueueJobDetailed,
  isQueueDepartmentStepRunnable,
} from "./studio-scheduler-plan";
