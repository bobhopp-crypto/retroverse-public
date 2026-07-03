/**
 * Retroverse Studio — department worker registry.
 */

import type {
  StudioDepartmentWorker,
  StudioDepartmentWorkerId,
} from "@/lib/studio/worker";

import { archiveWorker } from "@/lib/ops/studio/archive/worker";
import { collectorWorker } from "@/lib/ops/studio/collector/worker";
import { directorWorker } from "@/lib/ops/studio/director/worker";
import { editorWorker } from "@/lib/ops/studio/editor/worker";
import { researchWorker } from "@/lib/ops/intelligence/research-worker";
import { publisherWorker } from "@/lib/ops/studio/publisher/worker";

export { archiveWorker } from "@/lib/ops/studio/archive/worker";
export { collectorWorker } from "@/lib/ops/studio/collector/worker";
export { directorWorker } from "@/lib/ops/studio/director/worker";
export { editorWorker } from "@/lib/ops/studio/editor/worker";
export { publisherWorker } from "@/lib/ops/studio/publisher/worker";
export { researchWorker } from "@/lib/ops/intelligence/research-worker";

export const STUDIO_DEPARTMENT_WORKERS: Record<
  StudioDepartmentWorkerId,
  StudioDepartmentWorker
> = {
  collector: collectorWorker,
  editor: editorWorker,
  director: directorWorker,
  publisher: publisherWorker,
  research: researchWorker,
  archive: archiveWorker,
};

export function getDepartmentWorker(id: StudioDepartmentWorkerId): StudioDepartmentWorker {
  return STUDIO_DEPARTMENT_WORKERS[id];
}

export {
  getStudioExecutionEngine,
  resetStudioExecutionEngineForTests,
} from "./execution-engine";

export { requestStudioAi, studioAiBackendAvailable } from "./ai-request";

export {
  getWorkerCapabilityProfile,
  listWorkerCapabilityProfiles,
  queryWorkerProfiles,
} from "./profile-registry";
