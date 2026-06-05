import type { YearWorkspaceRow } from "./types";

export type ReviewOwnership = "video" | "audio" | "missing";

const VIDEO_PATH = /\/VIDEO\//i;
const VIDEO_EXT = /\.(mp4|mkv|mov|avi|m4v)$/i;
const MUSIC_PATH = /\/MUSIC\//i;
const AUDIO_EXT = /\.(mp3|m4a|flac|wav|aac|ogg)$/i;

/** Derive ownership from existing path + match flags (no extra SQL in Phase 1). */
export function ownershipForRow(row: Pick<YearWorkspaceRow, "sourcePath" | "vdjMatch">): ReviewOwnership {
  const path = row.sourcePath?.trim() ?? "";
  if (path && (VIDEO_PATH.test(path) || VIDEO_EXT.test(path))) return "video";
  if (path && (MUSIC_PATH.test(path) || AUDIO_EXT.test(path))) return "audio";
  if (row.vdjMatch === "matched") return "video";
  if (row.vdjMatch === "review") return "audio";
  return "missing";
}

export function ownershipLabel(ownership: ReviewOwnership): string {
  if (ownership === "video") return "Video";
  if (ownership === "audio") return "Audio";
  return "Missing";
}

export function ownershipTone(
  ownership: ReviewOwnership,
): "ok" | "warn" | "bad" | "info" {
  if (ownership === "video") return "ok";
  if (ownership === "audio") return "info";
  return "bad";
}
