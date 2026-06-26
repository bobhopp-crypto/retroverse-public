import "server-only";

import type { WorkerExecutionCost } from "@/lib/studio/worker-profile";

import { getStudioAiBackendRegistry } from "@/lib/ops/studio/ai/registry";
import {
  planQueueDepartmentStepDetailed,
  planQueueJob,
} from "@/lib/ops/browser-plus-2/studio-scheduler-plan";
import { resolveQueueWorker } from "@/lib/ops/browser-plus-2/studio-scheduler-map";
import type {
  Bp2StudioJobPlanSnapshot,
  Bp2StudioOperations,
  Bp2StudioQueueJob,
} from "@/lib/ops/browser-plus-2/types";
import { getWorkerCapabilityProfile } from "@/lib/ops/studio/workers/profile-registry";
import { getStudioExecutionEngine } from "@/lib/ops/studio/workers/execution-engine";

function formatCost(cost: WorkerExecutionCost): string {
  return cost;
}

async function buildJobPlanSnapshot(job: Bp2StudioQueueJob): Promise<Bp2StudioJobPlanSnapshot> {
  const syncPlan = planQueueJob({ department: job.department, rvtrs: job.rvtrs });
  const resolution = resolveQueueWorker(job.department);

  let runnable: boolean | null = syncPlan.runnable;
  let blockers = [...syncPlan.blockers];

  const assessRvtr = job.currentRvtr ?? job.rvtrs[job.currentIndex] ?? null;
  if (assessRvtr) {
    const detailed = await planQueueDepartmentStepDetailed(job.department, assessRvtr, {
      assessRunnability: true,
    });
    if (detailed) {
      runnable = detailed.runnable;
      blockers = [...new Set([...blockers, ...detailed.blockers])];
    }
  }

  const dominantCost = syncPlan.steps[0]?.estimatedExecutionCost ?? "medium";

  return {
    jobId: job.id,
    department: job.department,
    plannedTimeMs: syncPlan.totalEstimatedExecutionTimeMs,
    estimatedCost: formatCost(dominantCost),
    requiresInternet: syncPlan.requirements.requiresInternet,
    requiresOllama: syncPlan.requirements.requiresOllama,
    requiresVirtualDJ: syncPlan.requirements.requiresVirtualDJ,
    requiresLocalAssets: syncPlan.requirements.requiresLocalAssets,
    preferredAiBackend: syncPlan.requirements.preferredAiBackend,
    runnable,
    blockers,
    currentRvtr: job.currentRvtr,
    currentAction: resolution?.action ?? null,
  };
}

/** Load Studio kernel operations snapshot for Browser+ 2 dashboard. */
export async function loadStudioOperations(
  studioQueue: { jobs: Bp2StudioQueueJob[]; paused: boolean },
): Promise<Bp2StudioOperations> {
  const engine = getStudioExecutionEngine();
  const instances = engine.listWorkers();

  const runningJobs = studioQueue.jobs.filter((job) => job.status === "running");
  const actionByRvtr = new Map<string, string>();
  for (const job of runningJobs) {
    const resolution = resolveQueueWorker(job.department);
    if (job.currentRvtr && resolution) {
      actionByRvtr.set(job.currentRvtr, resolution.action);
    }
  }

  const workers = instances.map((instance) => {
    const profile = getWorkerCapabilityProfile(instance.workerId);
    return {
      instanceId: instance.instanceId,
      workerId: instance.workerId,
      department: instance.department,
      availability: instance.availability,
      enabled: instance.enabled,
      currentRvtr: instance.currentRvtr,
      currentAction: instance.currentRvtr
        ? (actionByRvtr.get(instance.currentRvtr) ?? null)
        : null,
      capabilities: [...instance.capabilities],
      summary: profile.summary,
      estimatedExecutionTimeMs: profile.estimatedExecutionTimeMs,
      estimatedExecutionCost: formatCost(profile.estimatedExecutionCost),
      preferredAiBackend: profile.preferredAiBackend,
      preferredModel: profile.preferredModel,
      requiresInternet: profile.requiresInternet,
      requiresOllama: profile.requiresOllama,
      requiresVirtualDJ: profile.requiresVirtualDJ,
      requiresLocalAssets: profile.requiresLocalAssets,
    };
  });

  const aiRegistry = getStudioAiBackendRegistry();
  const aiBackends = await Promise.all(
    aiRegistry.list().map(async (backend) => {
      const [available, health] = await Promise.all([backend.available(), backend.health()]);
      return {
        id: backend.id,
        kind: backend.kind,
        displayName: backend.displayName,
        available,
        ok: health.ok,
        detail: health.detail,
        latencyMs: health.latencyMs,
      };
    }),
  );

  const activeJobs = studioQueue.jobs.filter((job) =>
    ["queued", "running", "paused"].includes(job.status),
  );
  const jobPlans = await Promise.all(activeJobs.map((job) => buildJobPlanSnapshot(job)));

  return { workers, aiBackends, jobPlans };
}
