export type RuntimeServiceState =
  | "running"
  | "stopped"
  | "starting"
  | "waiting"
  | "connected"
  | "unavailable";

export type DevAppStatus = {
  app: "studio" | "live";
  state: RuntimeServiceState;
  healthy: boolean;
  port: number;
  url: string;
  owner: string | null;
  startedAt: string | null;
  wrapperPid: number | null;
};

export type RuntimeServiceCheck = {
  id: string;
  label: string;
  state: RuntimeServiceState;
  statusLabel: string;
  url: string | null;
  lastHealthCheck: string | null;
  responseMs: number | null;
};

export type LiveMonitorSnapshot = {
  song: string | null;
  artist: string | null;
  rvtr: string | null;
  updatedAt: string | null;
  url: string;
  coverUrl: string | null;
  destinationKind: string | null;
  reachable: boolean;
  error: string | null;
};

export type LiveSyncStatus = {
  inSync: boolean;
  label: "IN SYNC" | "OUT OF SYNC";
  differences: string[];
};

export type DeploymentRecommendation = {
  required: boolean;
  message: string;
  localCommit: string | null;
  productionCommit: string | null;
  dirty: boolean;
};

export type RuntimeHealthLevel = "healthy" | "degraded" | "down" | "unknown";

export type RuntimeSummary = {
  development: RuntimeHealthLevel;
  production: RuntimeHealthLevel;
  overallHealth: RuntimeHealthLevel;
  startupTimeMs: number | null;
  lastStartup: string | null;
  uptimeSeconds: number | null;
};

export type BridgePublicPushDiagnostics = {
  status: "synced" | "unconfigured" | "unreachable" | "rejected";
  detail: string;
  destination: string | null;
  httpStatus: number | null;
  at: string | null;
};

export type RuntimeDiagnostics = {
  startupLog: string[];
  healthFailures: string[];
  bridgeReconnectCount: number;
  oscErrors: number;
  lastDeploymentTime: string | null;
  bridgePublicPush: BridgePublicPushDiagnostics | null;
};

export type RetroverseRuntimeStatus = {
  summary: RuntimeSummary;
  services: RuntimeServiceCheck[];
  liveMonitor: {
    local: LiveMonitorSnapshot;
    public: LiveMonitorSnapshot;
    sync: LiveSyncStatus;
  };
  deployment: DeploymentRecommendation;
  diagnostics: RuntimeDiagnostics;
  studio: DevAppStatus;
  live: DevAppStatus;
  broadcast: "running" | "waiting";
  osc: "connected" | "waiting";
  virtualdj: "connected" | "waiting";
  vdjBridgeRunning: boolean;
  vdjBridgeCommand: string;
  studioUrl: string;
  liveUrl: string;
  lastStarted: string | null;
  uptimeSeconds: number | null;
  checkedAt: string;
};
