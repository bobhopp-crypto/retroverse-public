import type { PerformanceBrowserRow } from "./types";

export type EpisodePerformanceSummary = {
  performance_id: string;
  artist: string;
  title: string;
  status: PerformanceBrowserRow["status"];
  classification: PerformanceBrowserRow["classification"];
  start_sec: number;
  end_sec: number;
  start_timecode: string;
  end_timecode: string;
  export_status: "exported" | "ready" | "not_ready";
  export_path?: string;
};

export type EpisodeBrowserRow = {
  collection_id: string;
  collection_slug: string;
  collection_title: string;
  episode_id: string;
  episode_title: string;
  episode_number?: string;
  year: number | null;
  air_date?: string;
  duration_sec: number | null;
  download_status: "downloaded" | "missing";
  video_path?: string;
  performance_count: number;
  accepted_count: number;
  review_count: number;
  exported_count: number;
  performances: EpisodePerformanceSummary[];
};
