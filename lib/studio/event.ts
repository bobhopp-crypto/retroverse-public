import type { StudioKernelDepartmentId } from "./department";
import type { IsoTimestamp, JobStatus, Rvtr } from "./types";

export type StudioEventType =
  | "job.enqueued"
  | "job.started"
  | "job.step"
  | "job.item.completed"
  | "job.completed"
  | "job.failed"
  | "department.idle";

export type StudioEvent = {
  type: StudioEventType;
  at: IsoTimestamp;
  department: StudioKernelDepartmentId;
  jobId?: string;
  rvtr?: Rvtr;
  status?: JobStatus;
  message?: string;
};
