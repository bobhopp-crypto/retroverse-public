/**
 * Retroverse Studio Kernel — scheduler planning types and pure builders.
 *
 * Planning only — does not execute jobs or change queue behavior.
 */

import type { AiBackendKind } from "./ai-backend";
import { primaryWorkerInstanceId } from "./engine";
import type { WorkerCapabilityProfile, WorkerExecutionCost } from "./worker-profile";
import { profileSupportsAction } from "./worker-profile";
import type { DepartmentWorkerAction, StudioDepartmentWorkerId } from "./worker";

export type SchedulerStepRequirements = {
  requiresInternet: boolean;
  requiresOllama: boolean;
  requiresVirtualDJ: boolean;
  requiresLocalAssets: boolean;
  preferredAiBackend: AiBackendKind | null;
  preferredModel: string | null;
};

export type SchedulerStepPlan = {
  workerId: StudioDepartmentWorkerId;
  workerInstanceId: string;
  action: DepartmentWorkerAction;
  summary: string;
  capabilities: DepartmentWorkerAction[];
  requirements: SchedulerStepRequirements;
  estimatedExecutionTimeMs: number;
  estimatedExecutionCost: WorkerExecutionCost;
  /** null when runnability has not been assessed. */
  runnable: boolean | null;
  blockers: string[];
};

export type SchedulerJobStepPlan = SchedulerStepPlan & {
  rvtr: string;
};

export type SchedulerJobPlan = {
  department: string;
  steps: SchedulerJobStepPlan[];
  stepCount: number;
  totalEstimatedExecutionTimeMs: number;
  requirements: SchedulerStepRequirements;
  /** null when no step has been assessed yet. */
  runnable: boolean | null;
  blockers: string[];
};

export type SchedulerStepPlanInput = {
  workerId: StudioDepartmentWorkerId;
  action: DepartmentWorkerAction;
  profile: WorkerCapabilityProfile;
  workerInstanceId?: string;
};

export function requirementsFromProfile(
  profile: WorkerCapabilityProfile,
): SchedulerStepRequirements {
  return {
    requiresInternet: profile.requiresInternet,
    requiresOllama: profile.requiresOllama,
    requiresVirtualDJ: profile.requiresVirtualDJ,
    requiresLocalAssets: profile.requiresLocalAssets,
    preferredAiBackend: profile.preferredAiBackend,
    preferredModel: profile.preferredModel,
  };
}

/** Build a step plan from worker resolution + capability profile (sync). */
export function buildSchedulerStepPlan(input: SchedulerStepPlanInput): SchedulerStepPlan {
  const { workerId, action, profile } = input;
  const blockers: string[] = [];

  if (!profileSupportsAction(profile, action)) {
    blockers.push(`Worker ${workerId} does not support action ${action}`);
  }

  return {
    workerId,
    workerInstanceId: input.workerInstanceId ?? primaryWorkerInstanceId(workerId),
    action,
    summary: profile.summary,
    capabilities: [...profile.actions],
    requirements: requirementsFromProfile(profile),
    estimatedExecutionTimeMs: profile.estimatedExecutionTimeMs,
    estimatedExecutionCost: profile.estimatedExecutionCost,
    runnable: blockers.length > 0 ? false : null,
    blockers,
  };
}

/** Merge requirement flags across steps (OR for requires-* fields). */
export function mergeSchedulerRequirements(
  steps: SchedulerStepPlan[],
): SchedulerStepRequirements {
  return steps.reduce<SchedulerStepRequirements>(
    (acc, step) => ({
      requiresInternet: acc.requiresInternet || step.requirements.requiresInternet,
      requiresOllama: acc.requiresOllama || step.requirements.requiresOllama,
      requiresVirtualDJ: acc.requiresVirtualDJ || step.requirements.requiresVirtualDJ,
      requiresLocalAssets: acc.requiresLocalAssets || step.requirements.requiresLocalAssets,
      preferredAiBackend: acc.preferredAiBackend ?? step.requirements.preferredAiBackend,
      preferredModel: acc.preferredModel ?? step.requirements.preferredModel,
    }),
    {
      requiresInternet: false,
      requiresOllama: false,
      requiresVirtualDJ: false,
      requiresLocalAssets: false,
      preferredAiBackend: null,
      preferredModel: null,
    },
  );
}

export function aggregateSchedulerJobPlan(
  department: string,
  steps: SchedulerJobStepPlan[],
): SchedulerJobPlan {
  const profileSteps = steps.map(({ rvtr: _rvtr, ...plan }) => plan);
  const assessed = steps.filter((step) => step.runnable !== null);
  const runnable =
    assessed.length === 0
      ? null
      : assessed.every((step) => step.runnable === true && step.blockers.length === 0);

  const blockers = [
    ...new Set(steps.flatMap((step) => step.blockers).filter(Boolean)),
  ];

  return {
    department,
    steps,
    stepCount: steps.length,
    totalEstimatedExecutionTimeMs: steps.reduce(
      (sum, step) => sum + step.estimatedExecutionTimeMs,
      0,
    ),
    requirements: mergeSchedulerRequirements(profileSteps),
    runnable,
    blockers,
  };
}

/** Attach runnability assessment to an existing step plan. */
export function applyRunnabilityAssessment(
  plan: SchedulerStepPlan,
  assessment: { runnable: boolean; blockers: string[] },
): SchedulerStepPlan {
  const blockers = [...new Set([...plan.blockers, ...assessment.blockers])];
  return {
    ...plan,
    runnable: blockers.length === 0,
    blockers,
  };
}
