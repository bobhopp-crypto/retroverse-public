import { loadEpisodePerformanceManifest } from "@/lib/ops/media-collections/midnight-special/performances";
import { secToTimecode } from "@/lib/ops/media-collections/midnight-special/timecode";
import { parseEpisodeTitle } from "@/lib/ops/media-collections/parse-episode-title";
import { loadEpisodeMetaSnapshot } from "./episode-meta";

import type { EpisodeBrowserRow, EpisodePerformanceSummary } from "./episode-types";
import { searchEpisodeRows } from "./episode-utils";
import { listMidnightSpecialPerformanceRows } from "./ms-provider";
import type { PerformanceBrowserRow } from "./types";

export type { EpisodeBrowserRow, EpisodePerformanceSummary } from "./episode-types";
export { searchEpisodeRows, groupEpisodesByYear, episodeListLabel } from "./episode-utils";

function performanceSummaries(
  perfs: PerformanceBrowserRow[],
  exportPaths: Map<string, string | undefined>,
): EpisodePerformanceSummary[] {
  return perfs.map((p) => ({
    performance_id: p.performance_id,
    artist: p.artist,
    title: p.title,
    status: p.status,
    classification: p.classification,
    start_sec: p.effective_start,
    end_sec: p.effective_end,
    start_timecode: secToTimecode(p.effective_start),
    end_timecode: secToTimecode(p.effective_end),
    export_status:
      p.status === "exported"
        ? "exported"
        : p.status === "accepted"
          ? "ready"
          : "not_ready",
    export_path: exportPaths.get(p.performance_id),
  }));
}

async function enrichEpisodeRow(
  episodeId: string,
  perfs: PerformanceBrowserRow[],
): Promise<Pick<EpisodeBrowserRow, "episode_number" | "duration_sec" | "download_status" | "video_path">> {
  const head = perfs[0]!;
  const parsed = parseEpisodeTitle(head.episode_title);
  const meta = await loadEpisodeMetaSnapshot(episodeId);

  return {
    episode_number: meta.episode_number ?? parsed.episode_number,
    duration_sec: meta.duration_sec,
    download_status: meta.download_status,
    video_path: meta.download_path,
  };
}

export async function listEpisodeBrowserRows(
  collectionId = "midnight_special",
): Promise<EpisodeBrowserRow[]> {
  const rows = await listMidnightSpecialPerformanceRows();
  const filtered =
    collectionId === "all"
      ? rows
      : rows.filter((r) => r.collection_id === collectionId || r.collection_slug === collectionId);

  const byEpisode = new Map<string, PerformanceBrowserRow[]>();
  for (const row of filtered) {
    const list = byEpisode.get(row.episode_id) ?? [];
    list.push(row);
    byEpisode.set(row.episode_id, list);
  }

  const episodes: EpisodeBrowserRow[] = [];
  for (const [episodeId, perfs] of byEpisode) {
    const head = perfs[0]!;
    const extra = await enrichEpisodeRow(episodeId, perfs);
    const manifest = await loadEpisodePerformanceManifest(episodeId);
    const exportPaths = new Map(
      (manifest?.performances ?? []).map((p) => [p.performance_id, p.export_path]),
    );
    episodes.push({
      collection_id: head.collection_id,
      collection_slug: head.collection_slug,
      collection_title: head.collection_title,
      episode_id: episodeId,
      episode_title: head.episode_title,
      episode_number: extra.episode_number,
      year: head.year,
      air_date: head.air_date ?? parseEpisodeTitle(head.episode_title).air_date,
      duration_sec: extra.duration_sec,
      download_status: extra.download_status,
      video_path: extra.video_path,
      performance_count: perfs.length,
      accepted_count: perfs.filter((p) => p.status === "accepted" || p.status === "exported").length,
      review_count: perfs.filter((p) => p.status === "review").length,
      exported_count: perfs.filter((p) => p.status === "exported").length,
      performances: performanceSummaries(perfs, exportPaths),
    });
  }

  episodes.sort((a, b) => {
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    if (ya !== yb) return yb - ya;
    const na = Number(a.episode_number ?? 0);
    const nb = Number(b.episode_number ?? 0);
    if (na !== nb) return nb - na;
    return a.episode_title.localeCompare(b.episode_title);
  });

  return episodes;
}

export async function loadEpisodeBrowserDetail(
  episodeId: string,
  collectionId = "midnight_special",
): Promise<EpisodeBrowserRow | null> {
  const episodes = await listEpisodeBrowserRows(collectionId);
  return episodes.find((e) => e.episode_id === episodeId) ?? null;
}
