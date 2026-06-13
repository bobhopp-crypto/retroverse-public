import { readdir, stat } from "fs/promises";
import { join } from "path";

import { collectionSubdir } from "./paths";

export const VIDEO_EXT = /\.(mp4|mkv|webm|mov)$/i;
export const PART_EXT = /\.part$/i;

export function episodeDownloadDir(collectionId: string, episodeId: string): string {
  return join(collectionSubdir(collectionId, "downloads"), episodeId);
}

export async function findPartFile(dir: string): Promise<string | null> {
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const parts = files.filter((f) => PART_EXT.test(f));
  if (!parts.length) return null;

  let best: { path: string; size: number } | null = null;
  for (const name of parts) {
    const full = join(dir, name);
    try {
      const info = await stat(full);
      if (!best || info.size > best.size) best = { path: full, size: info.size };
    } catch {
      // skip
    }
  }
  return best?.path ?? null;
}

export async function findVideoFile(dir: string): Promise<string | null> {
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const candidates = files.filter((f) => VIDEO_EXT.test(f) && !f.endsWith(".part"));
  if (!candidates.length) return null;

  let best: { path: string; size: number } | null = null;
  for (const name of candidates) {
    const full = join(dir, name);
    try {
      const info = await stat(full);
      if (!best || info.size > best.size) {
        best = { path: full, size: info.size };
      }
    } catch {
      // skip
    }
  }
  return best?.path ?? null;
}
