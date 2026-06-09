import type { SegmentBucket } from "@/lib/ops/media-collections/midnight-special/classify-segment";
import type { MsPerformanceRecord, PerformanceStatus } from "@/lib/ops/media-collections/midnight-special/types";

export type PerformanceEditorSibling = {
  performance_id: string;
  artist: string;
  title: string;
  start_sec: number;
  end_sec: number;
  status: PerformanceStatus;
  bucket: SegmentBucket;
};

export type PerformanceEditorContext = {
  collection_id: string;
  episode_id: string;
  performance_id: string;
  episode_title: string;
  air_date?: string;
  artist: string;
  title: string;
  source_chapter: string;
  bucket: SegmentBucket;
  confidence: MsPerformanceRecord["confidence"];
  detected_start: number;
  detected_end: number;
  effective_start: number;
  effective_end: number;
  detected_start_timecode: string;
  detected_end_timecode: string;
  effective_start_timecode: string;
  effective_end_timecode: string;
  status: PerformanceStatus;
  video_url: string;
  video_path: string;
  episode_duration_sec: number;
  modified_at?: string;
  review_notes?: string;
  siblings: PerformanceEditorSibling[];
  sibling_index: number;
};
