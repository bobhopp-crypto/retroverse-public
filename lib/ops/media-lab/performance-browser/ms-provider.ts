import { buildClipReviewMediaLabHref } from "@/lib/ops/media-collections/midnight-special/clip-mode";
import { performanceEffectiveBounds } from "@/lib/ops/media-collections/midnight-special/effective-bounds";
import {
  bucketToExportGrouping,
  MS_COLLECTION_LABEL,
} from "@/lib/ops/media-collections/midnight-special/export-metadata";
import { classifyPerformance } from "@/lib/ops/media-collections/midnight-special/classify-segment";
import { loadEpisodePerformanceManifest } from "@/lib/ops/media-collections/midnight-special/performances";
import { MS_COLLECTION_ID, msPerformanceEpisodesDir } from "@/lib/ops/media-collections/midnight-special/paths";
import type { MsPerformanceRecord } from "@/lib/ops/media-collections/midnight-special/types";
import { parseYearFromAirDate } from "@/lib/ops/media-collections/midnight-special/timecode";
import { collectionSlugFromId } from "@/lib/ops/media-collections/paths";

import type { PerformanceBrowserRow } from "./types";

const BROWSER_RETURN = "/ops/media-lab/performances";

export async function listMidnightSpecialPerformanceRows(): Promise<PerformanceBrowserRow[]> {
  const { readdir, mkdir } = await import("fs/promises");
  await mkdir(msPerformanceEpisodesDir(), { recursive: true });

  let files: string[] = [];
  try {
    files = (await readdir(msPerformanceEpisodesDir())).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const slug = collectionSlugFromId(MS_COLLECTION_ID);
  const rows: PerformanceBrowserRow[] = [];

  for (const file of files) {
    const episodeId = file.replace(/\.json$/, "");
    const manifest = await loadEpisodePerformanceManifest(episodeId);
    if (!manifest) continue;

    for (const p of manifest.performances) {
      rows.push(recordToBrowserRow(p, manifest.episode_title, slug));
    }
  }

  rows.sort((a, b) => {
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    if (ya !== yb) return yb - ya;
    const artistCmp = (a.artist ?? "").localeCompare(b.artist ?? "");
    if (artistCmp !== 0) return artistCmp;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });

  return rows;
}

function recordToBrowserRow(
  record: MsPerformanceRecord,
  episodeTitle: string,
  collectionSlug: string,
): PerformanceBrowserRow {
  const bounds = performanceEffectiveBounds(record);
  const bucket = classifyPerformance(record);
  const grouping = bucketToExportGrouping(bucket);

  return {
    collection_id: MS_COLLECTION_ID,
    collection_slug: collectionSlug,
    collection_title: MS_COLLECTION_LABEL,
    episode_id: record.episode_id,
    episode_title: episodeTitle,
    performance_id: record.performance_id,
    artist: record.artist,
    title: record.song,
    year: parseYearFromAirDate(record.air_date) ?? null,
    air_date: record.air_date,
    status: record.status,
    classification: grouping ?? "Unknown",
    detected_start: record.start_seconds,
    detected_end: record.end_seconds,
    effective_start: bounds.start,
    effective_end: bounds.end,
    adjusted_start: record.adjusted_start,
    adjusted_end: record.adjusted_end,
    clip_review_href: buildClipReviewMediaLabHref({
      episodeId: record.episode_id,
      performanceId: record.performance_id,
      artist: record.artist,
      title: record.song,
      startTime: record.start_seconds,
      endTime: record.end_seconds,
      adjustedStart: record.adjusted_start,
      adjustedEnd: record.adjusted_end,
      returnHref: BROWSER_RETURN,
    }),
  };
}
