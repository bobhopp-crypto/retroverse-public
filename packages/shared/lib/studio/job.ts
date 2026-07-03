import type { StudioKernelDepartmentId } from "./department";
import type { IsoTimestamp, JobItemResult, JobStatus, Rvtr, StudioJobProgress } from "./types";

/** Envelope for a Studio batch job (queue implementations map to this shape). */
export type StudioJob = {
  id: string;
  department: StudioKernelDepartmentId;
  action: string;
  status: JobStatus;
  rvtrs: Rvtr[];
  currentRvtr: Rvtr | null;
  progress: StudioJobProgress;
  startedAt: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
  completedAt: IsoTimestamp | null;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  error: string | null;
  results: JobItemResult[];
};

/** Partial job used when enqueueing work. */
export type StudioJobEnqueue = Pick<StudioJob, "department" | "action" | "rvtrs"> & {
  priority?: number;
};
