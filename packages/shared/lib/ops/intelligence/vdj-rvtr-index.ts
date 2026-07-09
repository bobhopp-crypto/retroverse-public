import { readFile } from "fs/promises";

import { bundledVdjRvtrIndexPath } from "./paths";

export type VdjRvtrIndexEntry = {
  rvtr: string;
  artist: string;
  title: string;
  album: string | null;
  year: number | null;
};

type VdjRvtrIndexFile = {
  version: number;
  entries: Record<string, VdjRvtrIndexEntry>;
};

let cache: VdjRvtrIndexFile | null = null;

async function loadIndexFile(): Promise<VdjRvtrIndexFile | null> {
  if (cache) return cache;
  try {
    const raw = await readFile(bundledVdjRvtrIndexPath(), "utf-8");
    const parsed = JSON.parse(raw) as VdjRvtrIndexFile;
    if (!parsed?.entries || typeof parsed.entries !== "object") return null;
    cache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/** Bundled VirtualDJ metadata for an RVTR missing a SongPackage JSON. */
export async function loadBundledVdjRvtrEntry(rvtr: string): Promise<VdjRvtrIndexEntry | null> {
  const target = rvtr.trim().toUpperCase();
  const index = await loadIndexFile();
  const entry = index?.entries?.[target];
  if (!entry?.artist?.trim() || !entry?.title?.trim()) return null;
  return {
    rvtr: target,
    artist: entry.artist.trim(),
    title: entry.title.trim(),
    album: entry.album?.trim() || null,
    year: entry.year ?? null,
  };
}
