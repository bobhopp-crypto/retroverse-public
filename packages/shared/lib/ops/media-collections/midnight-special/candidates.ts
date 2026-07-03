import type { MsCandidateManifest, MsPerformanceCandidate, PerformanceReviewStatus } from "./types";
import {
  ensureEpisodePerformances,
  episodeManifestToCandidateShape,
  loadEpisodePerformanceManifest,
  updatePerformanceRecord,
} from "./performances";

export async function saveCandidateManifest(_manifest: MsCandidateManifest): Promise<string> {
  const { saveEpisodePerformanceManifest } = await import("./performances");
  const { performanceId } = await import("./performances");
  const performances = _manifest.performances.map((p) => ({
    performance_id: performanceId(_manifest.episode_id, p.chapter_index),
    episode_id: _manifest.episode_id,
    episode_title: _manifest.episode_title,
    air_date: _manifest.air_date,
    artist: p.artist,
    song: p.song,
    start_seconds: p.start_sec,
    end_seconds: p.end_sec,
    start_timecode: p.start_timecode,
    end_timecode: p.end_timecode,
    confidence: p.confidence,
    confidence_score: p.confidence_score,
    source_chapter: p.chapter_title,
    source_url: "",
    chapter_index: p.chapter_index,
    status:
      p.review_status === "accepted" || p.review_status === "adjusted"
        ? ("accepted" as const)
        : p.review_status === "rejected"
          ? ("rejected" as const)
          : ("candidate" as const),
    export_path: p.export_path,
    manually_edited: p.review_status === "adjusted",
    failed_parse: !p.song,
  }));
  const path = await saveEpisodePerformanceManifest({
    version: 1,
    collection_id: _manifest.collection_id,
    episode_id: _manifest.episode_id,
    episode_title: _manifest.episode_title,
    air_date: _manifest.air_date,
    air_year: _manifest.air_year,
    source_url: "",
    video_path: _manifest.video_path,
    generated_at: _manifest.generated_at,
    parser_version: _manifest.parser_version,
    performances,
  });
  return path;
}

export async function loadCandidateManifest(
  episodeId: string,
): Promise<MsCandidateManifest | null> {
  const manifest = await loadEpisodePerformanceManifest(episodeId);
  if (!manifest) return null;
  return episodeManifestToCandidateShape(manifest);
}

export async function ensureCandidateManifest(
  episodeId: string,
): Promise<MsCandidateManifest | null> {
  const manifest = await ensureEpisodePerformances(episodeId);
  if (!manifest) return null;
  return episodeManifestToCandidateShape(manifest);
}

export async function updatePerformanceReview(
  episodeId: string,
  performanceId: string,
  patch: {
    review_status: PerformanceReviewStatus;
    artist?: string;
    song?: string;
    start_sec?: number;
    end_sec?: number;
    export_path?: string;
  },
): Promise<MsPerformanceCandidate | null> {
  const status =
    patch.review_status === "accepted" || patch.review_status === "adjusted"
      ? "accepted"
      : patch.review_status === "rejected"
        ? "rejected"
        : "review";

  const updated = await updatePerformanceRecord(episodeId, performanceId, {
    status,
    artist: patch.artist,
    song: patch.song,
    start_seconds: patch.start_sec,
    end_seconds: patch.end_sec,
    export_path: patch.export_path,
    manually_edited:
      patch.review_status === "adjusted" ||
      patch.start_sec != null ||
      patch.end_sec != null,
  });
  if (!updated) return null;

  const shaped = episodeManifestToCandidateShape({
    version: 1,
    collection_id: "midnight_special",
    episode_id: episodeId,
    episode_title: updated.episode_title,
    source_url: updated.source_url,
    video_path: "",
    generated_at: new Date().toISOString(),
    parser_version: "ms-perf-v1",
    performances: [updated],
  });
  return shaped.performances[0] ?? null;
}
