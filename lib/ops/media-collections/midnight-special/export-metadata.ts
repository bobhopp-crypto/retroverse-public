import type { MsPerformanceCandidate } from "./types";

export const MS_COLLECTION_LABEL = "Midnight Special";

export type MsExportMetadata = {
  artist: string;
  title: string;
  album: string;
  grouping: string;
  year: string;
  comment: string;
};

export function buildExportMetadata(input: {
  perf: Pick<MsPerformanceCandidate, "artist" | "song">;
  episodeId: string;
  airYear?: number;
  sourceUrl: string;
}): MsExportMetadata {
  const artist = input.perf.artist.trim() || "Unknown Artist";
  const title = input.perf.song.trim() || "Unknown Song";
  const year = input.airYear ? String(input.airYear) : "";
  const comment = [
    `collection=${MS_COLLECTION_LABEL}`,
    `episode_id=${input.episodeId}`,
    year ? `air_year=${year}` : null,
    input.sourceUrl ? `source_url=${input.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    artist,
    title,
    album: MS_COLLECTION_LABEL,
    grouping: MS_COLLECTION_LABEL,
    year,
    comment,
  };
}

/** ffmpeg -metadata args (maps to VDJ Tags: Author, Title, Album, Grouping, Year, Comment). */
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
    "-metadata",
    `comment=${meta.comment}`,
  ];
  if (meta.year) {
    args.push("-metadata", `date=${meta.year}`);
    args.push("-metadata", `year=${meta.year}`);
  }
  return args;
}
