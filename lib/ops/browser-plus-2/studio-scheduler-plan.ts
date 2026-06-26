/**
 * Browser+ 2 — scheduler planning layer (read-only job evaluation).
 *
 * Produces plans for queue jobs using worker profiles and optional runnability checks.
 * Does not execute jobs or change queue drain behavior.
 */

import "server-only";

import {
  aggregateSchedulerJobPlan,
  applyRunnabilityAssessment,
  buildSchedulerStepPlan,
  type SchedulerJobPlan,
  type SchedulerJobStepPlan,
  type SchedulerStepPlan,
} from "@/lib/studio/scheduler-plan";
import { normalizeRvtr } from "@/lib/studio/status";

import { getWorkerCapabilityProfile } from "@/lib/ops/studio/workers/profile-registry";
import { getDepartmentWorker } from "@/lib/ops/studio/workers";
import { getStudioExecutionEngine } from "@/lib/ops/studio/workers/execution-engine";
import { studioAiBackendAvailable } from "@/lib/ops/studio/workers/ai-request";

import type { Bp2StudioQueueDepartment, Bp2StudioQueueJob } from "./types";
import { resolveQueueWorker } from "./studio-scheduler-map";

export type {
  SchedulerStepRequirements,
  SchedulerStepPlan,
  SchedulerJobStepPlan,
  SchedulerJobPlan,
} from "@/lib/studio/scheduler-plan";

export type PlanQueueStepOptions = {
  /** When true, assess worker availability, validation, and environment deps. */
  assessRunnability?: boolean;
};

async function assessStepRunnability(
  plan: SchedulerStepPlan,
  rvtr: string,
): Promise<{ runnable: boolean; blockers: string[] }> {
  const blockers: string[] = [];
  const normalized = normalizeRvtr(rvtr);

  if (!normalized) {
    return { runnable: false, blockers: ["Invalid RVTR"] };
  }

  const engine = getStudioExecutionEngine();
  const selected = engine.selectWorker({
    workerId: plan.workerId,
    action: plan.action,
    requireIdle: true,
  });
  if (!selected) {
    blockers.push("No available worker");
  }

  if (plan.requirements.requiresOllama) {
    const ollamaOk = await studioAiBackendAvailable("ollama");
    if (!ollamaOk) {
      blockers.push("Ollama not available");
    }
  }

  const validation = await getDepartmentWorker(plan.workerId).validate({
    rvtr: normalized,
    action: plan.action,
  });
  if (!validation.ok) {
    blockers.push(...validation.blockers);
  }

  const unique = [...new Set(blockers.filter(Boolean))];
  return { runnable: unique.length === 0, blockers: unique };
}

/** Build a sync step plan for one queue department + RVTR. */
export function planQueueDepartmentStep(
  department: Bp2StudioQueueDepartment,
  rvtr: string,
): SchedulerJobStepPlan | null {
  const resolution = resolveQueueWorker(department);
  if (!resolution) return null;

  const profile = getWorkerCapabilityProfile(resolution.workerId);
  const step = buildSchedulerStepPlan({
    workerId: resolution.workerId,
    action: resolution.action,
    profile,
  });

  return { rvtr, ...step };
}

/** Build a step plan with optional runnability assessment. */
export async function planQueueDepartmentStepDetailed(
  department: Bp2StudioQueueDepartment,
  rvtr: string,
  options: PlanQueueStepOptions = {},
): Promise<SchedulerJobStepPlan | null> {
  const base = planQueueDepartmentStep(department, rvtr);
  if (!base) return null;
  if (!options.assessRunnability) return base;

  const { rvtr: stepRvtr, ...plan } = base;
  const assessed = applyRunnabilityAssessment(plan, await assessStepRunnability(plan, stepRvtr));
  return { rvtr: stepRvtr, ...assessed };
}

/** Build a plan for an entire queue job. */
export function planQueueJob(
  job: Pick<Bp2StudioQueueJob, "department" | "rvtrs">,
): SchedulerJobPlan {
  const steps: SchedulerJobStepPlan[] = [];
  for (const rvtr of job.rvtrs) {
    const step = planQueueDepartmentStep(job.department, rvtr);
    if (step) steps.push(step);
  }
  return aggregateSchedulerJobPlan(job.department, steps);
}

/** Build a job plan with optional per-step runnability assessment. */
export async function planQueueJobDetailed(
  job: Pick<Bp2StudioQueueJob, "department" | "rvtrs">,
  options: PlanQueueStepOptions = {},
): Promise<SchedulerJobPlan> {
  const steps: SchedulerJobStepPlan[] = [];
  for (const rvtr of job.rvtrs) {
    const step = await planQueueDepartmentStepDetailed(job.department, rvtr, options);
    if (step) steps.push(step);
  }
  return aggregateSchedulerJobPlan(job.department, steps);
}

/** Convenience — answer whether a single step is runnable right now. */
export async function isQueueDepartmentStepRunnable(
  department: Bp2StudioQueueDepartment,
  rvtr: string,
): Promise<{ runnable: boolean; blockers: string[] }> {
  const step = await planQueueDepartmentStepDetailed(department, rvtr, {
    assessRunnability: true,
  });
  if (!step) {
    return { runnable: false, blockers: ["Unknown department"] };
  }
  return {
    runnable: step.runnable === true,
    blockers: step.blockers,
  };
}
