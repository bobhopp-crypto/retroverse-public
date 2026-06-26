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
  StudioConfidenceLabel,
  StudioNeedFlags,
  StudioLogEntry,
} from "./types";

export {
  normalizeRvtr,
  isValidRvtr,
  deriveStudioStage,
  studioStageLabel,
  normalizeJobStatus,
  studioConfidenceLabel,
  storyStatusFromEditorial,
  isStudioRenderReady,
  deriveStudioNeedFlags,
  buildStudioMissingItems,
  defaultStudioNeedFlags,
  defaultStudioMissingItems,
} from "./status";

export type {
  StudioEditorialStatusInput,
  StudioNeedFlagsInput,
  StudioMissingItemsInput,
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

export type {
  StudioContractDepartmentId,
  DepartmentContract,
  CollectorEditorHandoffDomain,
  CollectorEditorHandoffStatus,
  CollectorEditorHandoffItem,
  CollectorEditorHandoffView,
  EditorHandoffDomain,
  EditorHandoffStatus,
  EditorHandoffItem,
  EditorHandoffView,
} from "./contract";

export {
  STUDIO_DEPARTMENT_CONTRACTS,
  getDepartmentContract,
  departmentInputArtifacts,
  departmentOutputArtifacts,
} from "./contract";

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

export type {
  AiWorkerBackend,
  WorkerHealth,
  StudioDepartmentWorkerId,
  DepartmentWorkerAction,
  DepartmentWorkerStatus,
  DepartmentWorkerRunInput,
  DepartmentWorkerValidation,
  DepartmentWorkerArtifactStatus,
  DepartmentWorkerStatusResult,
  DepartmentWorkerRunResult,
  StudioDepartmentWorker,
  StudioDepartmentWorkerDefinition,
  StudioWorker,
  StudioAiWorker,
} from "./worker";

export {
  STUDIO_DEPARTMENT_WORKER_IDS,
  defineDepartmentWorker,
  resolveWorkerAction,
  blockedWorkerResult,
  failedWorkerResult,
} from "./worker";

export type {
  WorkerAvailabilityState,
  WorkerRegistration,
  WorkerInstanceSnapshot,
  WorkerDiscoveryCriteria,
  WorkerSelectionCriteria,
  ExecutionEngineRunInput,
  ExecutionEngineRunResult,
  StudioExecutionEngine,
} from "./engine";

export {
  createStudioExecutionEngine,
  primaryWorkerInstanceId,
} from "./engine";

export type {
  AiBackendKind,
  AiGenerateRequest,
  AiGenerateResult,
  StudioAiBackend,
  StudioAiBackendRegistry,
} from "./ai-backend";

export {
  createStudioAiBackendRegistry,
  OLLAMA_AI_BACKEND_ID,
  MCP_AI_BACKEND_ID,
  CLOUD_AI_BACKEND_ID,
} from "./ai-backend";

export type {
  WorkerExecutionCost,
  WorkerCapabilityProfile,
  WorkerProfileQuery,
} from "./worker-profile";

export {
  profileSupportsAction,
  matchesWorkerProfileQuery,
  queryWorkerCapabilityProfiles,
  defineWorkerCapabilityProfile,
} from "./worker-profile";

export type {
  SchedulerStepRequirements,
  SchedulerStepPlan,
  SchedulerJobStepPlan,
  SchedulerJobPlan,
  SchedulerStepPlanInput,
} from "./scheduler-plan";

export {
  requirementsFromProfile,
  buildSchedulerStepPlan,
  mergeSchedulerRequirements,
  aggregateSchedulerJobPlan,
  applyRunnabilityAssessment,
} from "./scheduler-plan";

export type { StudioEventType, StudioEvent } from "./event";

export type { StudioAssetKind, StudioAssetRef, StudioAssetManifestEntry } from "./asset";

export type { StudioHealthSnapshot, DepartmentHealthMetrics, StudioHealthCounts, StudioHealthRowInput } from "./metrics";

export {
  isDirectorReady,
  averagePatronValue,
  completionPct,
  buildStudioHealthCounts,
  studioHealthCountsToSnapshot,
} from "./metrics";

export {
  formatProcessLogLine,
  appendLogEntry,
  appendProcessLogLine,
} from "./logger";
