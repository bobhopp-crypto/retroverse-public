import { classifyPerformance, type SegmentBucket } from "./classify-segment";
import type { MsPerformanceCandidate, MsPerformanceRecord } from "./types";
import { parseYearFromAirDate } from "./timecode";

export const MS_COLLECTION_LABEL = "Midnight Special";

export type MsExportGrouping =
  | "Performance"
  | "Comedy"
  | "Interview"
  | "Intro"
  | "Movie Clip"
  | "Commercial";

export type MsExportMetadata = {
  artist: string;
  title: string;
  album: string;
  grouping: MsExportGrouping;
  year: string;
};

const BUCKET_TO_GROUPING: Record<Exclude<SegmentBucket, "UNKNOWN">, MsExportGrouping> = {
  MUSIC: "Performance",
  COMEDY: "Comedy",
  INTERVIEW: "Interview",
  INTRO_SEGMENT: "Intro",
  MOVIE_CLIP: "Movie Clip",
  COMMERCIAL: "Commercial",
};

export function bucketToExportGrouping(bucket: SegmentBucket): MsExportGrouping | null {
  if (bucket === "UNKNOWN") return null;
  return BUCKET_TO_GROUPING[bucket];
}

export function exportGroupingForRecord(record: MsPerformanceRecord): MsExportGrouping | null {
  return bucketToExportGrouping(classifyPerformance(record));
}

export function buildExportMetadata(input: {
  perf: Pick<MsPerformanceCandidate, "artist" | "song">;
  grouping: MsExportGrouping;
  airYear?: number;
}): MsExportMetadata {
  return {
    artist: (input.perf.artist ?? "").trim() || "Unknown Artist",
    title: (input.perf.song ?? "").trim() || "Unknown Song",
    album: MS_COLLECTION_LABEL,
    grouping: input.grouping,
    year: input.airYear ? String(input.airYear) : "",
  };
}

export function buildExportMetadataFromRecord(
  record: MsPerformanceRecord,
  airYear?: number,
): MsExportMetadata | null {
  const grouping = exportGroupingForRecord(record);
  if (!grouping) return null;
  const year = airYear ?? parseYearFromAirDate(record.air_date);
  return buildExportMetadata({
    perf: { artist: record.artist, song: record.song },
    grouping,
    airYear: year,
  });
}

/** ffmpeg -metadata args (maps to VDJ Tags: Author, Title, Album, Grouping, Year). */
export function ffmpegMetadataArgs(meta: MsExportMetadata): string[] {
  const args: string[] = [
    "-metadata",
    `title=${meta.title}`,
    "-metadata",
    `artist=${meta.artist}`,
    "-metadata",
    `album=${meta.album}`,
    "-metadata",
    `grouping=${meta.grouping}`,
  ];
  if (meta.year) {
    args.push("-metadata", `date=${meta.year}`);
    args.push("-metadata", `year=${meta.year}`);
  }
  return args;
}
