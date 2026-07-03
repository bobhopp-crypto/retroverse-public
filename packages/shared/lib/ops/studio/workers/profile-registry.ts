/**
 * Retroverse Studio — worker capability profile queries.
 */

import {
  queryWorkerCapabilityProfiles,
  type WorkerCapabilityProfile,
  type WorkerProfileQuery,
} from "@/lib/studio/worker-profile";
import type { StudioDepartmentWorkerId } from "@/lib/studio/worker";

import {
  getWorkerCapabilityProfile,
  listWorkerCapabilityProfiles,
} from "./profiles";

export type { WorkerCapabilityProfile, WorkerProfileQuery } from "@/lib/studio/worker-profile";

export { getWorkerCapabilityProfile, listWorkerCapabilityProfiles } from "./profiles";

export function queryWorkerProfiles(
  query: WorkerProfileQuery = {},
): WorkerCapabilityProfile[] {
  return queryWorkerCapabilityProfiles(listWorkerCapabilityProfiles(), query);
}

/** Profile for a registered engine instance (primary workers use canonical profiles). */
export function getEngineInstanceProfile(
  workerId: StudioDepartmentWorkerId,
): WorkerCapabilityProfile {
  return getWorkerCapabilityProfile(workerId);
}
