export type Top100ValidationRecentSong = {
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

export type Top100ValidationProgress = {
  version: 1;
  status: "idle" | "running" | "complete";
  startedAt: string | null;
  updatedAt: string;
  total: number;
  completed: number;
  remaining: number;
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
  recentCompleted: Top100ValidationRecentSong[];
};
