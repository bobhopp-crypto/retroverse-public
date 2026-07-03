import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";

/** Curator category folder names under the harvest library root. */
export const HARVEST_CATEGORY_FOLDERS = [
  "Commercial",
  "Performance",
  "Interview",
  "Promo",
  "TV Intro",
  "News",
  "Speech",
  "Bumper",
  "Station ID",
  "Other",
] as const;

export type HarvestCategoryFolder = (typeof HARVEST_CATEGORY_FOLDERS)[number];

export function harvestLibraryRoot(): string {
  const configured = process.env.MEDIA_LAB_LIBRARY?.trim();
  if (configured) return resolve(configured);
  return join(homedir(), "MEDIA_LAB_LIBRARY");
}

export function harvestManifestPath(): string {
  return join(harvestLibraryRoot(), "_MANIFESTS", "manifest.json");
}

export function harvestReportsDir(): string {
  return join(harvestLibraryRoot(), "_REPORTS");
}

export function harvestManifestsDir(): string {
  return join(harvestLibraryRoot(), "_MANIFESTS");
}

export function isAllowedHarvestPath(absPath: string): boolean {
  const root = harvestLibraryRoot();
  const resolved = resolve(absPath);
  if (resolved === root) return true;
  return resolved.startsWith(root + sep);
}

export function resolveHarvestRelativePath(relativePath: string): string {
  const root = harvestLibraryRoot();
  const resolved = resolve(root, relativePath.trim());
  if (!isAllowedHarvestPath(resolved)) {
    throw new Error("Path is outside the harvest library.");
  }
  return resolved;
}

export function categoryFolderForLabel(category?: string | null): HarvestCategoryFolder {
  const label = category?.trim();
  if (!label) return "Other";
  if ((HARVEST_CATEGORY_FOLDERS as readonly string[]).includes(label)) {
    return label as HarvestCategoryFolder;
  }
  return "Other";
}

export function categoryDirForLabel(category?: string | null): string {
  return join(harvestLibraryRoot(), categoryFolderForLabel(category));
}

export async function ensureHarvestLibraryLayout(): Promise<string> {
  const root = harvestLibraryRoot();
  await mkdir(harvestManifestsDir(), { recursive: true });
  await mkdir(harvestReportsDir(), { recursive: true });
  for (const folder of HARVEST_CATEGORY_FOLDERS) {
    await mkdir(join(root, folder), { recursive: true });
  }
  return root;
}
