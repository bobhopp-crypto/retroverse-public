/**
 * Retroverse Studio — bootstrapped execution engine with department workers.
 */

import "server-only";

import {
  createStudioExecutionEngine,
  primaryWorkerInstanceId,
  type StudioExecutionEngine,
} from "@/lib/studio/engine";
import type { StudioDepartmentWorkerId } from "@/lib/studio/worker";

import { STUDIO_DEPARTMENT_WORKERS } from "./index";
import { getWorkerCapabilityProfile } from "./profiles";

const ENGINE_CACHE_KEY = "__studioExecutionEngine";

function readCachedEngine(): StudioExecutionEngine | undefined {
  return (globalThis as Record<string, unknown>)[ENGINE_CACHE_KEY] as
    | StudioExecutionEngine
    | undefined;
}

function writeCachedEngine(engine: StudioExecutionEngine): void {
  (globalThis as Record<string, unknown>)[ENGINE_CACHE_KEY] = engine;
}

function bootstrapEngine(): StudioExecutionEngine {
  const engine = createStudioExecutionEngine();
  for (const workerId of Object.keys(STUDIO_DEPARTMENT_WORKERS) as StudioDepartmentWorkerId[]) {
    engine.register({
      instanceId: primaryWorkerInstanceId(workerId),
      worker: STUDIO_DEPARTMENT_WORKERS[workerId],
      profile: getWorkerCapabilityProfile(workerId),
    });
  }
  return engine;
}

/** Shared in-process engine — registers one primary worker per department. */
export function getStudioExecutionEngine(): StudioExecutionEngine {
  const cached = readCachedEngine();
  if (cached) return cached;
  const engine = bootstrapEngine();
  writeCachedEngine(engine);
  return engine;
}

/** Reset engine (tests only). */
export function resetStudioExecutionEngineForTests(): void {
  delete (globalThis as Record<string, unknown>)[ENGINE_CACHE_KEY];
}
