import type { StudioKernelDepartmentId } from "./department";
import type { PackageArtifactKind } from "./package";
import type { JobItemResult, Rvtr } from "./types";
import type { WorkerCapabilityProfile } from "./worker-profile";

export type AiWorkerBackend = "ollama" | "mcp" | "cloud" | "cli-agent";

export type WorkerHealth = {
  ok: boolean;
  latencyMs?: number;
  detail?: string;
};

/** Departments with executable Studio workers (see S-007). */
export type StudioDepartmentWorkerId =
  | "collector"
  | "editor"
  | "director"
  | "publisher"
  | "research"
  | "archive";

export const STUDIO_DEPARTMENT_WORKER_IDS: StudioDepartmentWorkerId[] = [
  "collector",
  "editor",
  "director",
  "publisher",
  "research",
  "archive",
];

export type DepartmentWorkerAction = string;

export type DepartmentWorkerStatus =
  | "idle"
  | "ready"
  | "blocked"
  | "running"
  | "complete"
  | "failed";

export type DepartmentWorkerRunInput = {
  rvtr: Rvtr;
  action?: DepartmentWorkerAction;
  payload?: Record<string, unknown>;
};

export type DepartmentWorkerValidation = {
  ok: boolean;
  status: DepartmentWorkerStatus;
  blockers: string[];
};

export type DepartmentWorkerArtifactStatus = Partial<Record<PackageArtifactKind, boolean>>;

export type DepartmentWorkerStatusResult = {
  status: DepartmentWorkerStatus;
  detail: string | null;
  artifactsPresent: DepartmentWorkerArtifactStatus;
};

export type DepartmentWorkerRunResult = JobItemResult & {
  action: DepartmentWorkerAction;
};

/** Standard execution interface for Studio department workers. */
export type StudioDepartmentWorker = {
  id: StudioDepartmentWorkerId;
  department: StudioKernelDepartmentId;
  capabilities: DepartmentWorkerAction[];
  defaultAction: DepartmentWorkerAction;
  /** Optional capability profile — usually supplied at engine registration. */
  profile?: WorkerCapabilityProfile;
  health(): Promise<WorkerHealth>;
  validate(input: {
    rvtr: Rvtr;
    action?: DepartmentWorkerAction;
  }): Promise<DepartmentWorkerValidation>;
  status(rvtr: Rvtr): Promise<DepartmentWorkerStatusResult>;
  run(input: DepartmentWorkerRunInput): Promise<DepartmentWorkerRunResult>;
  /** Scheduler-compatible alias — delegates to `run()` without the action field. */
  execute(input: {
    rvtr: Rvtr;
    action: string;
    payload?: Record<string, unknown>;
  }): Promise<JobItemResult>;
};

/** Worker definition before `execute()` shim is attached. */
export type StudioDepartmentWorkerDefinition = Omit<StudioDepartmentWorker, "execute"> & {
  execute?: StudioDepartmentWorker["execute"];
};

/** @deprecated Use `StudioDepartmentWorker` — alias preserved for scheduler stubs. */
export type StudioWorker = StudioDepartmentWorker;

export type StudioAiWorker = StudioDepartmentWorker & {
  backend: AiWorkerBackend;
  model?: string;
};

/** Attach default `execute()` when a worker only implements `run()`. */
export function defineDepartmentWorker(
  worker: StudioDepartmentWorkerDefinition,
): StudioDepartmentWorker {
  if (worker.execute) {
    return worker as StudioDepartmentWorker;
  }
  return {
    ...worker,
    execute: async (input) => {
      const result = await worker.run({
        rvtr: input.rvtr,
        action: input.action,
        payload: input.payload,
      });
      return {
        rvtr: result.rvtr,
        status: result.status,
        message: result.message,
      };
    },
  };
}

/** Resolve action from input or worker default. */
export function resolveWorkerAction(
  worker: Pick<StudioDepartmentWorker, "defaultAction" | "capabilities">,
  action: DepartmentWorkerAction | undefined,
): DepartmentWorkerAction {
  const resolved = action?.trim() || worker.defaultAction;
  if (!worker.capabilities.includes(resolved)) {
    return worker.defaultAction;
  }
  return resolved;
}

/** Map validation outcome to a skipped run result. */
export function blockedWorkerResult(
  rvtr: Rvtr,
  action: DepartmentWorkerAction,
  blockers: string[],
): DepartmentWorkerRunResult {
  return {
    rvtr,
    action,
    status: "skipped",
    message: blockers.join("; ") || "blocked",
  };
}

/** Map caught errors to failed run results. */
export function failedWorkerResult(
  rvtr: Rvtr,
  action: DepartmentWorkerAction,
  err: unknown,
): DepartmentWorkerRunResult {
  return {
    rvtr,
    action,
    status: "failed",
    message: err instanceof Error ? err.message : "worker_failed",
  };
}
