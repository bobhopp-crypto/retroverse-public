import { existsSync } from "node:fs";

import { analyzeMidnightSpecialEpisode } from "@/lib/ops/media-collections/midnight-special/analyze-episode";
import { ensureCandidateManifest } from "@/lib/ops/media-collections/midnight-special/candidates";
import {
  classifyPerformance,
  type SegmentBucket,
} from "@/lib/ops/media-collections/midnight-special/classify-segment";
import { performanceEffectiveBounds } from "@/lib/ops/media-collections/midnight-special/effective-bounds";
import { loadClipReviewContext } from "@/lib/ops/media-collections/midnight-special/clip-review";
import { loadEpisodePerformanceManifest } from "@/lib/ops/media-collections/midnight-special/performances";
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

export async function loadPerformanceEditorContext(
  episodeId: string,
  performanceId: string,
): Promise<PerformanceEditorContext | null> {
  const base = await loadClipReviewContext(episodeId, performanceId);
  if (!base) return null;

  const manifest = await loadEpisodePerformanceManifest(episodeId);
  if (!manifest) return null;

  const record = manifest.performances.find((p) => p.performance_id === performanceId);
  if (!record) return null;

  const candidate = await ensureCandidateManifest(episodeId);
  const videoPath = candidate?.video_path ?? manifest.video_path ?? "";

  const analysis = await analyzeMidnightSpecialEpisode(episodeId);
  const duration =
    analysis?.video_duration_sec && analysis.video_duration_sec > 0
      ? analysis.video_duration_sec
      : 7200;

  const siblings: PerformanceEditorSibling[] = manifest.performances.map((p) => {
    const bounds = performanceEffectiveBounds(p);
    return {
      performance_id: p.performance_id,
      artist: p.artist,
      title: p.song,
      start_sec: bounds.start,
      end_sec: bounds.end,
      status: p.status,
      bucket: classifyPerformance(p),
    };
  });

  const sibling_index = siblings.findIndex((s) => s.performance_id === performanceId);

  return {
    collection_id: base.collection_id,
    episode_id: base.episode_id,
    performance_id: base.performance_id,
    episode_title: base.episode_title,
    air_date: base.air_date,
    artist: base.artist,
    title: base.title,
    source_chapter: record.source_chapter,
    bucket: classifyPerformance(record),
    confidence: record.confidence,
    detected_start: base.detected_start,
    detected_end: base.detected_end,
    effective_start: base.effective_start,
    effective_end: base.effective_end,
    detected_start_timecode: base.detected_start_timecode,
    detected_end_timecode: base.detected_end_timecode,
    effective_start_timecode: base.effective_start_timecode,
    effective_end_timecode: base.effective_end_timecode,
    status: base.status,
    video_url: base.video_url,
    video_path: videoPath,
    episode_duration_sec: duration,
    modified_at: base.modified_at,
    review_notes: record.review_notes,
    siblings,
    sibling_index: sibling_index >= 0 ? sibling_index : 0,
  };
}
