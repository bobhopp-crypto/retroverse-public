/**
 * Retroverse Studio — canonical capability profiles per department worker.
 */

import type { WorkerCapabilityProfile } from "@/lib/studio/worker-profile";
import type { StudioDepartmentWorkerId } from "@/lib/studio/worker";

/** Matches `intelligenceModel()` default in ollama-client. */
const RESEARCH_DEFAULT_MODEL = "qwen3:8b";

export const STUDIO_WORKER_PROFILES: Record<StudioDepartmentWorkerId, WorkerCapabilityProfile> = {
  collector: {
    workerId: "collector",
    summary: "External research, VDJ media linkage, and visual asset extraction.",
    preferredAiBackend: null,
    preferredModel: null,
    supportsBatching: false,
    supportsBackgroundExecution: true,
    estimatedExecutionCost: "high",
    estimatedExecutionTimeMs: 120_000,
    requiresInternet: true,
    requiresOllama: false,
    requiresVirtualDJ: true,
    requiresLocalAssets: true,
    maximumConcurrency: 1,
    actions: ["run"],
  },
  editor: {
    workerId: "editor",
    summary: "Distill collector research into editable story packages.",
    preferredAiBackend: null,
    preferredModel: null,
    supportsBatching: false,
    supportsBackgroundExecution: true,
    estimatedExecutionCost: "medium",
    estimatedExecutionTimeMs: 60_000,
    requiresInternet: false,
    requiresOllama: false,
    requiresVirtualDJ: false,
    requiresLocalAssets: false,
    maximumConcurrency: 1,
    actions: ["draft", "save"],
  },
  director: {
    workerId: "director",
    summary: "Build experience plan and render spec from editor handoff.",
    preferredAiBackend: null,
    preferredModel: null,
    supportsBatching: false,
    supportsBackgroundExecution: true,
    estimatedExecutionCost: "medium",
    estimatedExecutionTimeMs: 30_000,
    requiresInternet: false,
    requiresOllama: false,
    requiresVirtualDJ: false,
    requiresLocalAssets: true,
    maximumConcurrency: 1,
    actions: ["run", "rebuild"],
  },
  publisher: {
    workerId: "publisher",
    summary: "Validate publish inputs — implementation stub.",
    preferredAiBackend: null,
    preferredModel: null,
    supportsBatching: false,
    supportsBackgroundExecution: false,
    estimatedExecutionCost: "low",
    estimatedExecutionTimeMs: 5_000,
    requiresInternet: false,
    requiresOllama: false,
    requiresVirtualDJ: false,
    requiresLocalAssets: false,
    maximumConcurrency: 1,
    actions: ["validate", "publish"],
  },
  research: {
    workerId: "research",
    summary: "Legacy intelligence pipeline — Ollama fact extraction and story proposals.",
    preferredAiBackend: "ollama",
    preferredModel: RESEARCH_DEFAULT_MODEL,
    supportsBatching: false,
    supportsBackgroundExecution: true,
    estimatedExecutionCost: "high",
    estimatedExecutionTimeMs: 90_000,
    requiresInternet: true,
    requiresOllama: true,
    requiresVirtualDJ: false,
    requiresLocalAssets: false,
    maximumConcurrency: 1,
    actions: ["process", "refresh"],
  },
  archive: {
    workerId: "archive",
    summary: "Verify on-disk Studio Alpha artifact layout.",
    preferredAiBackend: null,
    preferredModel: null,
    supportsBatching: true,
    supportsBackgroundExecution: true,
    estimatedExecutionCost: "low",
    estimatedExecutionTimeMs: 2_000,
    requiresInternet: false,
    requiresOllama: false,
    requiresVirtualDJ: false,
    requiresLocalAssets: true,
    maximumConcurrency: 1,
    actions: ["verify"],
  },
};

export function getWorkerCapabilityProfile(
  workerId: StudioDepartmentWorkerId,
): WorkerCapabilityProfile {
  return STUDIO_WORKER_PROFILES[workerId];
}

export function listWorkerCapabilityProfiles(): WorkerCapabilityProfile[] {
  return Object.values(STUDIO_WORKER_PROFILES);
}
