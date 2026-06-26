/** Retroverse Studio Kernel — shared infrastructure for all departments. */

export type {
  Rvtr,
  IsoTimestamp,
  JobStatus,
  JobItemStatus,
  JobItemResult,
  StudioJobProgress,
  IntelligencePackageStatus,
  StudioStage,
  StudioStoryStatus,
  StudioLogEntry,
} from "./types";

export {
  normalizeRvtr,
  isValidRvtr,
  deriveStudioStage,
  studioStageLabel,
  normalizeJobStatus,
} from "./status";

export type {
  StudioDepartmentId,
  StudioKernelDepartmentId,
  DepartmentBoundary,
  StudioDepartmentPlaceholders,
  StudioDepartment,
} from "./department";

export {
  DEPARTMENT_BOUNDARIES,
  STUDIO_DEPARTMENTS,
  STUDIO_ACTIVE,
  STUDIO_COMING_SOON,
  getStudioDepartment,
  getDepartmentBoundary,
} from "./department";

export type { PackageArtifactKind, ResearchDepartmentPaths } from "./package";

export {
  COLLECTOR_PACKAGE_VERSION,
  EDITOR_STORY_VERSION,
  DIRECTOR_EDITORIAL_VERSION,
  DIRECTOR_PLAN_VERSION,
  DIRECTOR_RENDER_SPEC_VERSION,
  researchDepartmentRoot,
  collectorSongDir,
  collectorOutputPath,
  collectorTempDir,
  collectorVisualAssetsDir,
  collectorProgressPath,
  editorOutputPath,
  editorV1BackupPath,
  directorHandoffPath,
  directorOutputPath,
  directorRenderSpecPath,
  intelligencePackagePath,
  researchDepartmentPaths,
  packageArtifactPath,
} from "./package";

export type { StudioJob, StudioJobEnqueue } from "./job";

export type {
  JsonQueueStoreMeta,
  RunnerLockOptions,
  StudioQueueAdapter,
  JsonQueueStoreOptions,
  JsonQueueStore,
  InProcessSingleFlight,
  RunnerLock,
} from "./queue";

export {
  queueNow,
  createJsonQueueStore,
  createInProcessSingleFlight,
  createRunnerLock,
  RUNNER_LOCK_STALE_MS,
} from "./queue";

export type { AiWorkerBackend, WorkerHealth, StudioWorker, StudioAiWorker } from "./worker";

export type { StudioEventType, StudioEvent } from "./event";

export type { StudioAssetKind, StudioAssetRef, StudioAssetManifestEntry } from "./asset";

export type { StudioHealthSnapshot, DepartmentHealthMetrics } from "./metrics";

export {
  formatProcessLogLine,
  appendLogEntry,
  appendProcessLogLine,
} from "./logger";
