import type {
  AcquisitionRow,
  WeeklyRefreshStatus,
  YearMatchRow,
} from "@/lib/ops/reconciliation-model";

export type { AcquisitionRow, WeeklyRefreshStatus, YearMatchRow };
export type { MatchStatus, AcquisitionStatus } from "@/lib/ops/reconciliation-model";

export type OpsActivityRow = {
  id: string;
  ts: string;
  entity: string;
  action: string;
  source: string;
  status: "ok" | "warn" | "error";
};

export type OpsDataStatus = {
  pgOk: boolean;
  pgError?: string;
  sources: string[];
  partial: string[];
  yearStats?: {
    chartRows: number;
    matched: number;
    missing: number;
  };
};

export type OpsConsoleData = {
  year: number;
  yearMatch: YearMatchRow[];
  acquisition: AcquisitionRow[];
  weeklyRefresh: WeeklyRefreshStatus;
  recentActivity: OpsActivityRow[];
  status: OpsDataStatus;
};

/** Legacy queue rows — loaders retained but not mounted on /ops homepage. */
export type OpsQueueMissingVideoRow = {
  id: string;
  artist: string;
  title: string;
  year?: number | null;
  localPath: string;
  r2Status: string;
  localBytes: number;
  r2Bytes?: number | null;
  modifiedAt: string;
};

export type OpsQueueMissingArtworkRow = {
  id: string;
  album: string;
  artist: string;
  year?: number | null;
  albumId: string | null;
  coverStatus: string;
  chartRelevance: string;
  curatorHref: string;
};

export type OpsQueueMetadataIssueRow = {
  id: string;
  issueType: string;
  entity: string;
  details: string;
  confidence: "high" | "medium" | "low";
  suggestedAction: string;
};

export type OpsQueuesData = {
  missingVideos: OpsQueueMissingVideoRow[];
  missingArtwork: OpsQueueMissingArtworkRow[];
  metadataIssues: OpsQueueMetadataIssueRow[];
  recentActivity: OpsActivityRow[];
  status: OpsDataStatus;
};
