/** Sprint 3.18 — live department status (Mission Control source of truth). */

export type StudioDepartmentId = "collector" | "editor" | "director" | "publisher";

export type DepartmentRunStatus = "idle" | "running" | "waiting" | "error";

export type DepartmentLiveSong = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl?: string | null;
  subtitle?: string;
};

export type DepartmentLiveStatus = {
  department: StudioDepartmentId;
  generatedAt: string;
  status: DepartmentRunStatus;
  currentSong: DepartmentLiveSong | null;
  queueRemaining: number;
  completedCount: number;
  /** Count completed today (when tracked). Falls back to completedCount for display. */
  completedToday: number;
  lastCompletedSong: DepartmentLiveSong | null;
  startedAt: string | null;
  percentComplete: number | null;
  /** Total packages evaluated (publisher) or complete (other depts). */
  packageTotal?: number;
  publishedCount?: number;
};

export type StudioPipelineEvent = {
  id: string;
  at: string;
  department: StudioDepartmentId | "system";
  type: string;
  message: string;
  rvtr?: string;
};

export type StudioPipelineEventStore = {
  version: 1;
  updatedAt: string;
  events: StudioPipelineEvent[];
};

export type DepartmentRuntimeSlot = {
  status: DepartmentRunStatus;
  currentSong: DepartmentLiveSong | null;
  startedAt: string | null;
  percentComplete: number | null;
  lastCompletedSong: DepartmentLiveSong | null;
};

export type DepartmentRuntimeProgressStore = {
  version: 1;
  updatedAt: string;
  editor: DepartmentRuntimeSlot;
  director: DepartmentRuntimeSlot;
  publisher: DepartmentRuntimeSlot;
};

export type DepartmentQueueIndex = {
  generatedAt: string;
  totalVideoRows: number;
  publishedTotal: number;
  collector: {
    waiting: number;
    complete: number;
    nextInQueue: DepartmentLiveSong | null;
  };
  editor: {
    waiting: number;
    complete: number;
    nextInQueue: DepartmentLiveSong | null;
  };
  director: {
    waiting: number;
    complete: number;
    nextInQueue: DepartmentLiveSong | null;
  };
  publisher: {
    waiting: number;
    complete: number;
    evaluated: number;
    approved: number;
    nextInQueue: DepartmentLiveSong | null;
  };
};

export type StudioMissionControlPayload = {
  generatedAt: string;
  departments: Record<StudioDepartmentId, DepartmentLiveStatus>;
  activity: StudioPipelineEvent[];
  queueIndex: DepartmentQueueIndex;
};
