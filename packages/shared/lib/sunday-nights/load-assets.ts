import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import type { SundayAssetItem, SundayAssetLibrary } from "./asset-types";
import type { SundayPlaylistSong, SundayYearFilter } from "./playlist-types";
import { SUNDAY_EVENT_YEARS } from "./playlist-types";

const ASSETS_PATH = join(process.cwd(), "data", "sunday-nights", "assets.json");

function emptyLibrary(): SundayAssetLibrary {
  return { version: 1, updatedAt: new Date().toISOString(), items: [] };
}

function normalizeLibrary(raw: unknown): SundayAssetLibrary {
  if (!raw || typeof raw !== "object") return emptyLibrary();
  const obj = raw as Partial<SundayAssetLibrary>;
  const items = Array.isArray(obj.items) ? obj.items.filter(isAssetItem) : [];
  return {
    version: 1,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
    items,
  };
}

function isAssetItem(raw: unknown): raw is SundayAssetItem {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Partial<SundayAssetItem>;
  return (
    typeof o.key === "string" &&
    o.key.trim().length > 0 &&
    typeof o.year === "number" &&
    typeof o.type === "string" &&
    typeof o.artist === "string" &&
    typeof o.title === "string"
  );
}

export async function loadSundayAssetLibrary(): Promise<SundayAssetLibrary> {
  try {
    const raw = await readFile(ASSETS_PATH, "utf8");
    return normalizeLibrary(JSON.parse(raw));
  } catch {
    return emptyLibrary();
  }
}

export async function saveSundayAssetLibrary(library: SundayAssetLibrary): Promise<void> {
  const next: SundayAssetLibrary = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: library.items,
  };
  await writeFile(ASSETS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function assetToPlaylistItem(item: SundayAssetItem): SundayPlaylistSong {
  return {
    key: item.key,
    year: item.year,
    artist: item.artist,
    title: item.title,
    rvtr: item.rvtr,
    path: item.path ?? `asset://${item.key}`,
    kind: "asset",
    assetType: item.type,
    tags: item.tags ?? [],
  };
}

export async function loadSundayAssetsAsSongs(
  yearFilter: SundayYearFilter,
): Promise<SundayPlaylistSong[]> {
  const library = await loadSundayAssetLibrary();
  const years =
    yearFilter === "all" ? new Set<number>(SUNDAY_EVENT_YEARS) : new Set([yearFilter]);
  return library.items
    .filter((item) => years.has(item.year))
    .map(assetToPlaylistItem)
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
}

export function mergeSongsAndAssets(
  songs: SundayPlaylistSong[],
  assets: SundayPlaylistSong[],
): SundayPlaylistSong[] {
  const merged = [
    ...songs.map((s) => ({ ...s, kind: s.kind ?? ("song" as const) })),
    ...assets,
  ];
  merged.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const ka = a.kind === "asset" ? 1 : 0;
    const kb = b.kind === "asset" ? 1 : 0;
    if (ka !== kb) return ka - kb;
    return a.title.localeCompare(b.title);
  });
  return merged;
}
