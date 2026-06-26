/** Retroverse Studio Kernel — shared primitives. */

/** Canonical RVTR identifier (e.g. RVTR759486). */
export type Rvtr = string;

export type IsoTimestamp = string;

/** Unified job lifecycle status across Studio queues. */
export type JobStatus = "queued" | "running" | "paused" | "complete" | "failed";

/** Per-RVTR outcome within a batch job. */
export type JobItemStatus = "complete" | "failed" | "skipped";

export type JobItemResult = {
  rvtr: Rvtr;
  status: JobItemStatus;
  message: string;
};

/** Batch progress shape shared by queue implementations. */
export type StudioJobProgress = {
  current: number;
  total: number;
  step: string;
};

/** Intelligence-line package status (legacy research pipeline). */
export type IntelligencePackageStatus =
  | "draft"
  | "processing"
  | "review"
  | "cards_ready"
  | "approved"
  | "published";

/** Studio Alpha pipeline stage for a single RVTR. */
export type StudioStage = "not_started" | "collector" | "editor" | "director" | "complete";

export type StudioStoryStatus = "Ready" | "Needs Review" | "Weak" | "None";

export type StudioConfidenceLabel = "Early" | "Strong" | "Good" | "Developing";

export type StudioNeedFlags = {
  needsCollector: boolean;
  needsEditor: boolean;
  needsDirector: boolean;
  readyToPublish: boolean;
};

/** Structured process log entry (kernel shape). */
export type StudioLogEntry = {
  at: IsoTimestamp;
  message: string;
};
