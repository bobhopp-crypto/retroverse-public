export type BackfillQueueRow = {
  albumId: number;
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  b200Peak: number | null;
};

export type BackfillAlbumResult = {
  rval: string;
  ok: boolean;
  reason: string;
  coverPath: string | null;
};

export type BackfillBatchResult = {
  batchId: string;
  batchIndex: number;
  processed: number;
  success: number;
  failure: number;
  fromMain?: number;
  fromRetry?: number;
  skippedDueToRetryRules?: number;
  results: BackfillAlbumResult[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export type AlbumAttemptRecord = {
  last_attempt_at: string;
  attempt_count: number;
  failure_reason: string | null;
  last_outcome: "success" | "failure";
  artist?: string;
  album?: string;
};

export type BackfillState = {
  version: 2;
  startedAt: string;
  updatedAt: string;
  /** Index into PG-ordered missing queue — advances on every main-queue pull. */
  mainCursor: number;
  /** RVALs that failed; processed after main cursor exhausts fresh queue. */
  retryQueue: string[];
  /** Per-RVAL attempt metadata. */
  albumAttempts: Record<string, AlbumAttemptRecord>;
  /** Distinct RVALs with at least one attempt. */
  uniqueAlbumsProcessed: number;
  /** Distinct RVALs whose last outcome was success. */
  uniqueSuccessCount: number;
  /** Distinct RVALs whose last outcome was failure. */
  uniqueFailureCount: number;
  /** Cached retry queue length. */
  retryQueueSize: number;
  /** Cumulative albums skipped due to retry cooldown rules. */
  skippedRetryTotal: number;
  /** Legacy — total batch attempt rows (includes retries). */
  cursor: number;
  totalQueued: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  currentBatchIndex: number;
  paused: boolean;
  running: boolean;
  lastBatchAt: string | null;
  lastBatchId: string | null;
  lastError: string | null;
  batchHistory: Array<{
    batchId: string;
    at: string;
    processed: number;
    success: number;
    failure: number;
    durationMs: number;
    fromMain?: number;
    fromRetry?: number;
    skippedDueToRetryRules?: number;
  }>;
};

export type BackfillMetrics = {
  coversRemaining: number;
  coversAcquiredToday: number;
  averagePerHour: number;
  /** Batch-level success rate (includes retries). */
  successRate: number;
  /** Unique RVAL success rate — use for projections. */
  uniqueSuccessRate: number;
  etaMs: number | null;
  uniqueAlbumsProcessed: number;
  uniqueSuccesses: number;
  uniqueFailures: number;
  retryQueueSize: number;
  mainQueuePosition: number;
  skippedDueToRetryRules: number;
  /** Currently covered RVAL albums in PG. */
  currentlyCovered: number;
  /** Projected additional covers if uniqueSuccessRate holds. */
  projectedAdditionalCovers: number;
  /** Projected total covered if uniqueSuccessRate holds. */
  projectedTotalCovered: number;
  /** Projected coverage % of RVAL corpus if rate holds. */
  projectedCoveragePct: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
};

export type BackfillStatus = {
  state: BackfillState;
  metrics: BackfillMetrics;
  currentBatch: BackfillBatchResult | null;
};
