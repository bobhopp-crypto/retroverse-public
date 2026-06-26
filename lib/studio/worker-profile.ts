/**
 * Retroverse Studio Kernel — worker capability profiles.
 *
 * Describes what each worker is best at so the Scheduler can query requirements
 * and estimates before intelligent routing is enabled.
 */

import type { AiBackendKind } from "./ai-backend";
import type { DepartmentWorkerAction, StudioDepartmentWorkerId } from "./worker";

export type WorkerExecutionCost = "low" | "medium" | "high";

/** Canonical capability profile for a department worker. */
export type WorkerCapabilityProfile = {
  workerId: StudioDepartmentWorkerId;
  /** Short human-readable summary for ops / scheduler introspection. */
  summary: string;
  preferredAiBackend: AiBackendKind | null;
  preferredModel: string | null;
  supportsBatching: boolean;
  supportsBackgroundExecution: boolean;
  estimatedExecutionCost: WorkerExecutionCost;
  /** Typical per-RVTR runtime in milliseconds. */
  estimatedExecutionTimeMs: number;
  requiresInternet: boolean;
  requiresOllama: boolean;
  requiresVirtualDJ: boolean;
  requiresLocalAssets: boolean;
  maximumConcurrency: number;
  /** When set, profile applies only to these actions (empty = all actions). */
  actions: DepartmentWorkerAction[];
};

export type WorkerProfileQuery = {
  workerId?: StudioDepartmentWorkerId;
  action?: DepartmentWorkerAction;
  preferredAiBackend?: AiBackendKind;
  requiresOllama?: boolean;
  requiresInternet?: boolean;
  requiresVirtualDJ?: boolean;
  requiresLocalAssets?: boolean;
  supportsBatching?: boolean;
  supportsBackgroundExecution?: boolean;
  maxEstimatedExecutionTimeMs?: number;
  maxEstimatedExecutionCost?: WorkerExecutionCost;
};

const COST_RANK: Record<WorkerExecutionCost, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Whether a profile applies to a given action. */
export function profileSupportsAction(
  profile: WorkerCapabilityProfile,
  action: DepartmentWorkerAction,
): boolean {
  if (profile.actions.length === 0) return true;
  return profile.actions.includes(action);
}

/** Filter profiles by scheduler query criteria. */
export function matchesWorkerProfileQuery(
  profile: WorkerCapabilityProfile,
  query: WorkerProfileQuery,
): boolean {
  if (query.workerId && profile.workerId !== query.workerId) return false;
  if (query.action && !profileSupportsAction(profile, query.action)) return false;
  if (query.preferredAiBackend && profile.preferredAiBackend !== query.preferredAiBackend) {
    return false;
  }
  if (query.requiresOllama !== undefined && profile.requiresOllama !== query.requiresOllama) {
    return false;
  }
  if (query.requiresInternet !== undefined && profile.requiresInternet !== query.requiresInternet) {
    return false;
  }
  if (
    query.requiresVirtualDJ !== undefined &&
    profile.requiresVirtualDJ !== query.requiresVirtualDJ
  ) {
    return false;
  }
  if (
    query.requiresLocalAssets !== undefined &&
    profile.requiresLocalAssets !== query.requiresLocalAssets
  ) {
    return false;
  }
  if (
    query.supportsBatching !== undefined &&
    profile.supportsBatching !== query.supportsBatching
  ) {
    return false;
  }
  if (
    query.supportsBackgroundExecution !== undefined &&
    profile.supportsBackgroundExecution !== query.supportsBackgroundExecution
  ) {
    return false;
  }
  if (
    query.maxEstimatedExecutionTimeMs !== undefined &&
    profile.estimatedExecutionTimeMs > query.maxEstimatedExecutionTimeMs
  ) {
    return false;
  }
  if (query.maxEstimatedExecutionCost !== undefined) {
    if (COST_RANK[profile.estimatedExecutionCost] > COST_RANK[query.maxEstimatedExecutionCost]) {
      return false;
    }
  }
  return true;
}

export function queryWorkerCapabilityProfiles(
  profiles: WorkerCapabilityProfile[],
  query: WorkerProfileQuery = {},
): WorkerCapabilityProfile[] {
  return profiles.filter((profile) => matchesWorkerProfileQuery(profile, query));
}

/** Merge partial overrides onto a base profile (tests / future variants). */
export function defineWorkerCapabilityProfile(
  base: WorkerCapabilityProfile,
  overrides: Partial<WorkerCapabilityProfile> = {},
): WorkerCapabilityProfile {
  return { ...base, ...overrides, workerId: base.workerId };
}
