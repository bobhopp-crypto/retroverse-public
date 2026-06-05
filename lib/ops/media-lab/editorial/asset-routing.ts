import { homedir } from "node:os";
import { join } from "path";

import {
  CONTENT_TYPES,
  parseTypedTitle,
  type ContentType,
} from "./transcript-suggestions";

/**
 * Single source of truth for VDJ asset folder routing.
 * Add categories here — existing exports keep stable folder names.
 */
export const ASSET_ROUTE_BY_TYPE: Record<ContentType, string> = {
  Commercial: "COMMERCIALS",
  Performance: "PERFORMANCES",
  Promo: "PROMOS",
  "Movie Trailer": "TRAILERS",
  News: "NEWS",
  Award: "TV",
  "Acceptance Speech": "TV",
  Presenter: "TV",
  Interview: "TV",
  "Station ID": "BUMPERS",
};

export const DEFAULT_ASSET_FOLDER = "UNCLASSIFIED";

export const ASSET_CATEGORY_FOLDERS = [
  "COMMERCIALS",
  "PERFORMANCES",
  "PROMOS",
  "TRAILERS",
  "TV",
  "NEWS",
  "BUMPERS",
  "UNCLASSIFIED",
] as const;

export type AssetCategoryFolder = (typeof ASSET_CATEGORY_FOLDERS)[number];

export function djMediaVideoRoot(): string {
  const override = process.env.DJ_MEDIA_VIDEO?.trim();
  if (override) return override;
  return join(homedir(), "DJ MEDIA", "VIDEO");
}

export function sourceArchiveDir(): string {
  return join(djMediaVideoRoot(), "ARCHIVE");
}

export function assetsRootDir(): string {
  return join(djMediaVideoRoot(), "ASSETS");
}

export function resolveAssetFolder(contentType: ContentType | null): AssetCategoryFolder {
  if (!contentType) return DEFAULT_ASSET_FOLDER;
  const folder = ASSET_ROUTE_BY_TYPE[contentType];
  if (ASSET_CATEGORY_FOLDERS.includes(folder as AssetCategoryFolder)) {
    return folder as AssetCategoryFolder;
  }
  return DEFAULT_ASSET_FOLDER;
}

export function resolveAssetFolderFromTitle(title: string): AssetCategoryFolder {
  const parsed = parseTypedTitle(title);
  return resolveAssetFolder(parsed.type);
}

export function clipDestinationDir(contentType: ContentType | null): string {
  return join(assetsRootDir(), resolveAssetFolder(contentType));
}

export function clipDestinationDirFromTitle(title: string): string {
  return join(assetsRootDir(), resolveAssetFolderFromTitle(title));
}

export type AssetRouteSummary = {
  contentType: ContentType;
  folder: AssetCategoryFolder;
  path: string;
};

/** For UI — show where each content type lands. */
export function listAssetRouteSummary(): AssetRouteSummary[] {
  return CONTENT_TYPES.map((contentType) => {
    const folder = resolveAssetFolder(contentType);
    return {
      contentType,
      folder,
      path: join(assetsRootDir(), folder),
    };
  });
}

export function allAssetDestinationDirs(): string[] {
  const dirs = new Set<string>([join(assetsRootDir(), DEFAULT_ASSET_FOLDER)]);
  for (const folder of ASSET_CATEGORY_FOLDERS) {
    dirs.add(join(assetsRootDir(), folder));
  }
  return [...dirs];
}
