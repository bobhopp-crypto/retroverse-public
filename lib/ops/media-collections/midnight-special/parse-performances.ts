import { analyzeMidnightSpecialEpisode, loadYtDlpMetadata } from "./analyze-episode";
import type {
  MsCandidateManifest,
  MsChapter,
  MsPerformanceCandidate,
  PerformanceConfidence,
} from "./types";
import { parseDescriptionTimecode, parseYearFromAirDate, secToTimecode } from "./timecode";
import { MS_COLLECTION_ID } from "./paths";
import { loadEpisode } from "../state";
import { parseEpisodeTitle } from "../parse-episode-title";

const PARSER_VERSION = "ms-perf-v1";
const SKIP_CHAPTER = /^(intro|outro|end|credits?|commercial|intermission|host|opening|closing)\b/i;

import { parseArtistSong } from "./parse-artist-song";

export { parseArtistSong };

function descriptionChapterMap(description: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const line of description.split(/\r?\n/)) {
    const trimmed = line.trim();
    const sec = parseDescriptionTimecode(trimmed);
    if (sec == null) continue;
    const rest = trimmed.replace(/^\d{2}:\d{2}:\d{2}\s+/, "").trim();
    if (rest) map.set(sec, rest);
  }
  return map;
}

function scoreConfidence(
  chapter: MsChapter,
  parsed: { artist: string; song: string } | null,
  descMap: Map<number, string>,
): { confidence: PerformanceConfidence; score: number } {
  if (!parsed) return { confidence: "low", score: 0.35 };

  const descLine = descMap.get(Math.floor(chapter.start_time));
  if (descLine) {
    const descParsed = parseArtistSong(descLine);
    if (
      descParsed &&
      descParsed.artist.toLowerCase() === parsed.artist.toLowerCase() &&
      descParsed.song.toLowerCase() === parsed.song.toLowerCase()
    ) {
      return { confidence: "exact", score: 0.98 };
    }
    if (descLine.toLowerCase().includes(parsed.artist.toLowerCase())) {
      return { confidence: "high", score: 0.88 };
    }
  }

  if (parsed.artist.length >= 2 && parsed.song.length >= 2) {
    return { confidence: "high", score: 0.82 };
  }
  return { confidence: "medium", score: 0.55 };
}

export function chaptersToPerformances(
  chapters: MsChapter[],
  description: string,
): {
  performances: Omit<MsPerformanceCandidate, "id" | "review_status">[];
  skipped: number;
} {
  const descMap = descriptionChapterMap(description);
  const performances: Omit<MsPerformanceCandidate, "id" | "review_status">[] = [];
  let skipped = 0;

  chapters.forEach((chapter, chapterIndex) => {
    const title = chapter.title.trim();
    if (!title || SKIP_CHAPTER.test(title)) {
      skipped += 1;
      return;
    }

    const parsed = parseArtistSong(title);
    const { confidence, score } = scoreConfidence(chapter, parsed, descMap);

    performances.push({
      artist: parsed?.artist ?? title,
      song: parsed?.song ?? "",
      start_sec: chapter.start_time,
      end_sec: chapter.end_time,
      start_timecode: secToTimecode(chapter.start_time),
      end_timecode: secToTimecode(chapter.end_time),
      confidence,
      confidence_score: score,
      source: "chapter",
      chapter_title: title,
      chapter_index: chapterIndex,
    });
  });

  return { performances, skipped };
}

export async function generateCandidateManifest(
  episodeId: string,
): Promise<MsCandidateManifest | null> {
  const episode = await loadEpisode(MS_COLLECTION_ID, episodeId);
  if (!episode?.download_path) return null;

  const analysis = await analyzeMidnightSpecialEpisode(episodeId);
  const meta = await loadYtDlpMetadata(episodeId);
  if (!meta?.chapters?.length) return null;

  const { air_date } = parseEpisodeTitle(episode.title);
  const airDate = episode.air_date ?? air_date;
  const airYear = parseYearFromAirDate(airDate);

  let description = meta.description ?? "";
  if (!description.trim()) {
    try {
      const { readFile } = await import("fs/promises");
      const { msDescriptionPath } = await import("./paths");
      description = await readFile(msDescriptionPath(episodeId), "utf8");
    } catch {
      description = "";
    }
  }

  const { performances: raw, skipped } = chaptersToPerformances(meta.chapters, description);

  const byConfidence: Record<PerformanceConfidence, number> = {
    exact: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const p of raw) byConfidence[p.confidence] += 1;

  const autoEligible = raw.filter(
    (p) => p.confidence === "exact" || p.confidence === "high",
  ).length;
  const automation_rate_pct =
    raw.length > 0 ? Math.round((autoEligible / raw.length) * 1000) / 10 : 0;

  const performances: MsPerformanceCandidate[] = raw.map((p, i) => ({
    ...p,
    id: `perf-${String(i + 1).padStart(3, "0")}`,
    review_status: "pending",
  }));

  return {
    version: 1,
    collection_id: MS_COLLECTION_ID,
    episode_id: episodeId,
    episode_title: episode.title,
    air_date: airDate,
    air_year: airYear,
    video_path: episode.download_path,
    generated_at: new Date().toISOString(),
    parser_version: PARSER_VERSION,
    performances,
    stats: {
      chapter_count: meta.chapters.length,
      performance_count: performances.length,
      skipped_count: skipped,
      by_confidence: byConfidence,
      automation_rate_pct,
    },
  };
}
