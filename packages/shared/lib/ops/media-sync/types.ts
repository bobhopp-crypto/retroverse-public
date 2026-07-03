export type MediaSyncSummary = {
  totalLocalVideo: number;
  totalR2Keys: number;
  matchedUploads: number;
  missingOnR2: number;
  localOnly: number;
  r2Only: number;
  unmatchedChartLinked: number;
  lastRefreshAt: string | null;
  dataSource: "live_postgres" | "snapshot_stub";
  snapshotNote: string;
};

export type MediaSyncRow = {
  id: string;
  mediaId: number;
  filename: string;
  filepath: string;
  artist: string;
  title: string;
  fileSize: number | null;
  modifiedAt: string;
  r2Key: string | null;
  linkage: "linked" | "unlinked";
  linkCount: number;
  driftNote?: string | null;
};

export type MediaSyncQueues = {
  missingOnR2: MediaSyncRow[];
  localNewVideos: MediaSyncRow[];
  r2Orphans: MediaSyncRow[];
  metadataDrift: MediaSyncRow[];
  uploadedUnmatched: MediaSyncRow[];
};

export type MediaSyncConsoleData = {
  summary: MediaSyncSummary;
  queues: MediaSyncQueues;
  reviewedIds: string[];
  status: {
    pgOk: boolean;
    pgError?: string;
    partial: string[];
  };
};
