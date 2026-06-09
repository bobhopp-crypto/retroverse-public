import { readFile, stat } from "fs/promises";

import { loadEpisode } from "../state";
import { parseEpisodeTitle } from "../parse-episode-title";
import { msDescriptionPath, msMetadataPath, MS_COLLECTION_ID } from "./paths";
import type { MsChapter, MsEpisodeAnalysis } from "./types";
import { parseDescriptionTimecode, parseYearFromAirDate } from "./timecode";

type YtDlpMetadata = {
  duration?: number;
  description?: string;
  chapters?: MsChapter[];
};

export async function loadYtDlpMetadata(episodeId: string): Promise<YtDlpMetadata | null> {
  try {
    const raw = await readFile(msMetadataPath(episodeId), "utf8");
    return JSON.parse(raw) as YtDlpMetadata;
  } catch {
    return null;
  }
}

export async function analyzeMidnightSpecialEpisode(
  episodeId: string,
): Promise<MsEpisodeAnalysis | null> {
  const episode = await loadEpisode(MS_COLLECTION_ID, episodeId);
  if (!episode) return null;

  const { air_date } = parseEpisodeTitle(episode.title);
  const airDate = episode.air_date ?? air_date;
  const airYear = parseYearFromAirDate(airDate);

  let videoBytes: number | null = null;
  if (episode.download_path) {
    try {
      videoBytes = (await stat(episode.download_path)).size;
    } catch {
      videoBytes = null;
    }
  }

  const meta = await loadYtDlpMetadata(episodeId);
  let descriptionText = "";
  let descriptionPath: string | null = null;
  try {
    descriptionPath = msDescriptionPath(episodeId);
    descriptionText = await readFile(descriptionPath, "utf8");
  } catch {
    descriptionPath = null;
  }

  const descLines = descriptionText.split(/\r?\n/);
  const descChapterLines = descLines.filter((l) => /^\d{2}:\d{2}:\d{2}\s+/.test(l.trim()));

  const ytdlpChapters = meta?.chapters ?? [];
  const ytdlpHas = ytdlpChapters.length > 0;
  const descHas = descChapterLines.length > 0;

  let chaptersAligned = false;
  if (ytdlpHas && descHas) {
    const sample = ytdlpChapters.find((c) => !/^intro$/i.test(c.title.trim()));
    if (sample) {
      const descMatch = descChapterLines.find((l) =>
        l.toLowerCase().includes(sample.title.toLowerCase().slice(0, 12)),
      );
      if (descMatch) {
        const descSec = parseDescriptionTimecode(descMatch.trim());
        chaptersAligned =
          descSec != null && Math.abs(descSec - sample.start_time) <= 2;
      }
    }
  }

  const structured: string[] = [];
  if (episode.download_path) structured.push("video_file");
  if (descriptionPath) structured.push("description_txt");
  if (meta) structured.push("ytdlp_info_json");
  if (ytdlpHas) structured.push("ytdlp_chapters");
  if (descHas) structured.push("description_chapter_markers");
  if (meta?.duration) structured.push("duration_seconds");
  if (episode.episode_number) structured.push("episode_number");
  if (airDate) structured.push("air_date");

  return {
    episode_id: episodeId,
    episode_title: episode.title,
    air_date: airDate,
    air_year: airYear,
    video_path: episode.download_path ?? null,
    video_bytes: videoBytes,
    video_duration_sec:
      typeof meta?.duration === "number"
        ? meta.duration
        : episode.duration_seconds ?? null,
    description_path: descriptionPath,
    description_lines: descLines.length,
    description_chapter_lines: descChapterLines.length,
    metadata_path: meta ? msMetadataPath(episodeId) : null,
    ytdlp_chapter_count: ytdlpChapters.length,
    ytdlp_has_chapters: ytdlpHas,
    description_has_chapters: descHas,
    chapters_aligned: chaptersAligned,
    structured_fields: structured,
    analyzed_at: new Date().toISOString(),
  };
}
