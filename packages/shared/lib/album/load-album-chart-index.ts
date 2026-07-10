import "server-only";

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

import type { AlbumChartFeatureRow } from "./album-chart-features";

export type AlbumChartFeaturesIndex = {
  version: 1;
  generatedAt: string;
  albums: AlbumChartFeatureRow[];
};

function resolveIndexPath(): string {
  let dir = process.cwd();
  for (let i = 0; i < 4; i += 1) {
    const candidate = join(dir, "data", "album-chart-features.json");
    if (existsSync(candidate)) return candidate;
    dir = join(dir, "..");
  }
  return join(process.cwd(), "data", "album-chart-features.json");
}

const INDEX_PATH = resolveIndexPath();

let cachedIndex: AlbumChartFeaturesIndex | null = null;

export async function loadAlbumChartFeaturesIndex(): Promise<AlbumChartFeaturesIndex | null> {
  if (cachedIndex) return cachedIndex;
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as AlbumChartFeaturesIndex;
    if (!Array.isArray(parsed.albums)) return null;
    cachedIndex = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAlbumChartFeaturesIndexCache(): void {
  cachedIndex = null;
}
