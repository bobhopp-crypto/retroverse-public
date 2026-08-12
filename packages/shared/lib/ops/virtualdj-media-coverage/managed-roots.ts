import { normalize, resolve, sep } from "path";

export const MANAGED_AUDIO_ROOT = "/Users/bobhopp/DJ MEDIA/MUSIC";
export const MANAGED_VIDEO_ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO";
export const EXCLUDED_VIDEO_VAULT_ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO VAULT";

export type ManagedMediaClass =
  | "managed_audio"
  | "managed_video"
  | "excluded_video_vault"
  | "outside_managed_library";

function normalizedAbsolutePath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/")) return null;
  return normalize(resolve(trimmed));
}

function isWithin(path: string, root: string): boolean {
  const candidate = normalizedAbsolutePath(path);
  const boundary = normalizedAbsolutePath(root);
  if (!candidate || !boundary) return false;
  const lower = candidate.toLowerCase();
  const rootLower = boundary.toLowerCase();
  return lower === rootLower || lower.startsWith(`${rootLower}${sep}`);
}

export function classifyManagedMediaPath(filePath: string): ManagedMediaClass {
  if (isWithin(filePath, EXCLUDED_VIDEO_VAULT_ROOT)) return "excluded_video_vault";
  if (isWithin(filePath, MANAGED_AUDIO_ROOT)) return "managed_audio";
  if (isWithin(filePath, MANAGED_VIDEO_ROOT)) return "managed_video";
  return "outside_managed_library";
}

export function isManagedAudioPath(filePath: string): boolean {
  return classifyManagedMediaPath(filePath) === "managed_audio";
}

