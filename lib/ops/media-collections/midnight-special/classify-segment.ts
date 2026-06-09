import {
  parseArtistSong,
  parseArtistSongSecondPass,
  parseConfidenceSupportsMusic,
} from "./parse-artist-song";
import type { MsPerformanceRecord, PerformanceConfidence } from "./types";

export type SegmentBucket =
  | "MUSIC"
  | "COMEDY"
  | "INTRO_SEGMENT"
  | "INTERVIEW"
  | "MOVIE_CLIP"
  | "COMMERCIAL"
  | "UNKNOWN";

export type ClassifiedPerformance = MsPerformanceRecord & {
  bucket: SegmentBucket;
};

const COMEDY_RE =
  /\b(comedy|sketch|monty python|steve martin|david steinberg|freddie prinze|jimmie walker|committee|ace trucking|kentucky fried|carlin|braver|troupe|laugh-?in|national lampoon|funny business|stand-?up)\b|\[comedy segment\]/i;

const MOVIE_CLIP_RE =
  /\b(clip\b|movie clip|from the film|from the movie|scene from|excerpt from|clip from)\b|^clip\b/i;

const INTERVIEW_RE = /\b(interview|speaks with|talks with|conversation with|q&a|qa with)\b/i;

const INTRO_RE =
  /\b(intro|prologue|juggles|tribute|monologue|welcome|opening remarks|host segment|intermission|announcer|presents|introduces)\b|^(intro|outro|host)\b/i;

const DIALOGUE_RE = /\b(dialogue|conversation)\b/i;

const COMMERCIAL_RE = /\b(commercial break|commercial|sponsor|promo|advertisement)\b/i;

export function classifyPerformance(record: MsPerformanceRecord): SegmentBucket {
  const chapter = record.source_chapter.trim();
  const chapterLower = chapter.toLowerCase();
  const combined = `${chapterLower} ${(record.artist ?? "").toLowerCase()} ${(record.song ?? "").toLowerCase()}`;

  if (COMMERCIAL_RE.test(combined)) return "COMMERCIAL";
  if (MOVIE_CLIP_RE.test(combined) || /^clip\b/i.test(chapter)) return "MOVIE_CLIP";
  if (COMEDY_RE.test(combined) || COMEDY_RE.test(chapter)) return "COMEDY";
  if (INTERVIEW_RE.test(combined) || DIALOGUE_RE.test(combined)) return "INTERVIEW";
  if (INTRO_RE.test(combined)) return "INTRO_SEGMENT";

  if (parseArtistSong(chapter)) return "MUSIC";
  if (/^[^"]+\s+"/.test(chapter)) return "MUSIC";
  if (record.artist && record.song && !record.failed_parse) return "MUSIC";
  if (
    record.song &&
    record.confidence !== "low" &&
    !record.failed_parse &&
    record.artist.length >= 2
  ) {
    return "MUSIC";
  }

  const secondPass = parseArtistSongSecondPass(chapter);
  if (secondPass && parseConfidenceSupportsMusic(secondPass)) return "MUSIC";

  if (
    record.failed_parse &&
    chapter.length >= 4 &&
    !/\b(intro|outro|host|commercial|dialogue|introduces)\b/i.test(chapter)
  ) {
    const words = chapter.split(/\s+/).length;
    if (words >= 2 || chapter.length >= 8) return "MUSIC";
  }

  return "UNKNOWN";
}

export type QueueComposition = {
  MUSIC: number;
  COMEDY: number;
  INTRO_SEGMENT: number;
  INTERVIEW: number;
  MOVIE_CLIP: number;
  COMMERCIAL: number;
  UNKNOWN: number;
};

export function emptyComposition(): QueueComposition {
  return {
    MUSIC: 0,
    COMEDY: 0,
    INTRO_SEGMENT: 0,
    INTERVIEW: 0,
    MOVIE_CLIP: 0,
    COMMERCIAL: 0,
    UNKNOWN: 0,
  };
}

export function classifyQueue(records: MsPerformanceRecord[]): ClassifiedPerformance[] {
  return records.map((r) => ({ ...r, bucket: classifyPerformance(r) }));
}

export function compositionCounts(items: ClassifiedPerformance[]): QueueComposition {
  const counts = emptyComposition();
  for (const item of items) counts[item.bucket] += 1;
  return counts;
}

export type ReviewFilter =
  | "ALL"
  | "MUSIC"
  | "COMEDY"
  | "INTROS"
  | "MOVIE_CLIPS"
  | "UNKNOWN";

export function filterByBucket(
  items: ClassifiedPerformance[],
  filter: ReviewFilter,
): ClassifiedPerformance[] {
  if (filter === "ALL") return items;
  if (filter === "MUSIC") return items.filter((i) => i.bucket === "MUSIC");
  if (filter === "COMEDY") return items.filter((i) => i.bucket === "COMEDY");
  if (filter === "INTROS") {
    return items.filter((i) => i.bucket === "INTRO_SEGMENT" || i.bucket === "INTERVIEW");
  }
  if (filter === "MOVIE_CLIPS") return items.filter((i) => i.bucket === "MOVIE_CLIP");
  return items.filter(
    (i) => i.bucket === "UNKNOWN" || i.bucket === "COMMERCIAL",
  );
}

export function summaryFromComposition(c: QueueComposition): {
  music: number;
  comedy_skits: number;
  intros_interstitials: number;
  movie_clips: number;
  unknown: number;
} {
  return {
    music: c.MUSIC,
    comedy_skits: c.COMEDY,
    intros_interstitials: c.INTRO_SEGMENT + c.INTERVIEW,
    movie_clips: c.MOVIE_CLIP,
    unknown: c.UNKNOWN + c.COMMERCIAL,
  };
}

export function confidenceLabel(c: PerformanceConfidence): string {
  return c.toUpperCase();
}
