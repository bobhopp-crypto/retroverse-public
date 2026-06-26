import type { StudioKernelDepartmentId } from "./department";
import type { JobItemResult, Rvtr } from "./types";

export type AiWorkerBackend = "ollama" | "mcp" | "cli-agent";

export type WorkerHealth = {
  ok: boolean;
  latencyMs?: number;
  detail?: string;
};

/** Worker registration stub — implementations attach in the AI and Scheduler phases. */
export type StudioWorker = {
  id: string;
  department: StudioKernelDepartmentId;
  capabilities: string[];
  health(): Promise<WorkerHealth>;
  execute(input: { rvtr: Rvtr; action: string; payload?: Record<string, unknown> }): Promise<JobItemResult>;
};

export type StudioAiWorker = StudioWorker & {
  backend: AiWorkerBackend;
  model?: string;
};
