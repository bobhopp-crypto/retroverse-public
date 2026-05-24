export type TrackTrajectoryWeek = {
  issueDate: string;
  rank: number;
  lastWeek: number | null;
  peakToDate: number | null;
  weeksOnChart: number | null;
  x: number;
  previousX: number | null;
  movement: "debut" | "up" | "down" | "same" | "reentry";
  delta: number | null;
  reentry: boolean;
};
