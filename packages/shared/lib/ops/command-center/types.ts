export type ModuleStatusTone = "green" | "blue" | "yellow" | "orange" | "red" | "gray";

export type ModuleAction =
  | "Open"
  | "Continue"
  | "Review"
  | "Control"
  | "Publish"
  | "Inspect"
  | "Launch";

export type PackageHighlight = {
  rvtr: string;
  title: string;
  artist: string;
  status: string;
  updatedAt: string | null;
};

export type PackageIndexSummary = {
  total: number;
  published: number;
  review: number;
  draft: number;
  updatedAt: string | null;
  latestPublished: PackageHighlight | null;
  latestReview: PackageHighlight | null;
  latestUpdated: PackageHighlight | null;
};

export type FinanceAttentionSummary = {
  count: number;
  latestLabel: string | null;
  latestCreatedAt: string | null;
};

export type CommandCenterModule = {
  id: string;
  title: string;
  primaryMetric: string;
  progress: number;
  progressLabel: string;
  healthStrip: ModuleStatusTone;
  status: ModuleStatusTone;
  statusLabel: string;
  lastEvent: string;
  attentionBadges: string[];
  lastUpdated: string | null;
  secondaryMetrics: Array<{ label: string; value: string }>;
  action: ModuleAction;
  actionHref: string;
};

export type CommandCenterDashboard = {
  generatedAt: string;
  overallStatus: ModuleStatusTone;
  overallHeadline: string;
  overallDetail: string;
  modules: CommandCenterModule[];
};
