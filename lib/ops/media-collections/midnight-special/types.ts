export type PerformanceConfidence = "exact" | "high" | "medium" | "low";

/** Canonical review lifecycle for performances/ manifests */
export type PerformanceStatus = "candidate" | "accepted" | "review" | "rejected" | "exported";

/** Legacy POC field — mapped to PerformanceStatus in performances store */
export type PerformanceReviewStatus = "pending" | "accepted" | "rejected" | "adjusted";

export type MsPerformanceRecord = {
  performance_id: string;
  episode_id: string;
  episode_title: string;
  air_date?: string;
  artist: string;
  song: string;
  start_seconds: number;
  end_seconds: number;
  start_timecode: string;
  end_timecode: string;
  confidence: PerformanceConfidence;
  confidence_score: number;
  source_chapter: string;
  source_url: string;
  chapter_index: number;
  status: PerformanceStatus;
  export_path?: string;
  manually_edited?: boolean;
  failed_parse?: boolean;
};

export type MsEpisodePerformanceManifest = {
  version: 1;
  collection_id: string;
  episode_id: string;
  episode_title: string;
  air_date?: string;
  air_year?: number;
  source_url: string;
  video_path: string;
  generated_at: string;
  parser_version: string;
  performances: MsPerformanceRecord[];
};

export type MsPerformanceCollectionIndex = {
  version: 1;
  collection_id: string;
  updated_at: string;
  parser_version: string;
  stats: MsPerformanceCollectionStats;
};

export type MsPerformanceCollectionStats = {
  episodes_downloaded: number;
  episodes_with_performances: number;
  episodes_zero_candidates: number;
  performances_total: number;
  candidate: number;
  accepted: number;
  review: number;
  rejected: number;
  exported: number;
  ready_to_export: number;
  failed_parse_count: number;
  estimated_export_bytes: number;
  estimated_export_gb: number;
};

export type MsChapter = {
  start_time: number;
  end_time: number;
  title: string;
};

export type MsPerformanceCandidate = {
  id: string;
  artist: string;
  song: string;
  start_sec: number;
  end_sec: number;
  start_timecode: string;
  end_timecode: string;
  confidence: PerformanceConfidence;
  confidence_score: number;
  source: "chapter" | "description";
  chapter_title: string;
  chapter_index: number;
  review_status: PerformanceReviewStatus;
  export_path?: string;
};

export type MsCandidateManifest = {
  version: 1;
  collection_id: string;
  episode_id: string;
  episode_title: string;
  air_date?: string;
  air_year?: number;
  video_path: string;
  generated_at: string;
  parser_version: string;
  performances: MsPerformanceCandidate[];
  stats: {
    chapter_count: number;
    performance_count: number;
    skipped_count: number;
    by_confidence: Record<PerformanceConfidence, number>;
    automation_rate_pct: number;
  };
};

export type MsEpisodeAnalysis = {
  episode_id: string;
  episode_title: string;
  air_date?: string;
  air_year?: number;
  video_path: string | null;
  video_bytes: number | null;
  video_duration_sec: number | null;
  description_path: string | null;
  description_lines: number;
  description_chapter_lines: number;
  metadata_path: string | null;
  ytdlp_chapter_count: number;
  ytdlp_has_chapters: boolean;
  description_has_chapters: boolean;
  chapters_aligned: boolean;
  structured_fields: string[];
  analyzed_at: string;
};
