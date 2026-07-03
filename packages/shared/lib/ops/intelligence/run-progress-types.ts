export type IntelligenceRunRecentSong = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  status: "completed" | "failed";
  runtimeMs: number;
  confidence: number;
  facts: number;
  stories: number;
  artifactsReady: boolean;
  error?: string;
  completedAt: string;
};

export type IntelligenceRunProgress = {
  version: 1;
  runId: string;
  label: string;
  cohortLimit: number;
  status: "idle" | "running" | "complete";
  startedAt: string | null;
  updatedAt: string;
  total: number;
  completed: number;
  remaining: number;
  successes: number;
  failures: number;
  currentSong: {
    rvtr: string;
    title: string;
    artist: string;
    playCount: number;
    index: number;
  } | null;
  eta: string | null;
  avgRuntimeMs: number | null;
  recentCompleted: IntelligenceRunRecentSong[];
};
