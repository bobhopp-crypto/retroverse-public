import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import type { CachedSongExperience } from "./experience-types";

function experienceCacheDir(): string {
  return join(retroverseDataRoot(), "ops", "intelligence", "experience-cache");
}

function experienceCachePath(rvtr: string): string {
  return join(experienceCacheDir(), `${rvtr.trim().toUpperCase()}.json`);
}

export async function loadCachedSongExperience(
  rvtr: string,
): Promise<CachedSongExperience | null> {
  try {
    const raw = await readFile(experienceCachePath(rvtr), "utf8");
    const parsed = JSON.parse(raw) as CachedSongExperience;
    if (parsed.version !== 1 && parsed.version !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedSongExperience(
  cache: CachedSongExperience,
): Promise<CachedSongExperience> {
  const dir = experienceCacheDir();
  await mkdir(dir, { recursive: true });
  await writeFile(experienceCachePath(cache.rvtr), `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return cache;
}

export async function invalidateSongExperienceCache(rvtr: string): Promise<void> {
  try {
    await unlink(experienceCachePath(rvtr));
  } catch {
    /* cache may not exist */
  }
}

export function isExperienceCacheFresh(
  cache: CachedSongExperience | null,
  packageUpdatedAt: string | null,
): boolean {
  if (!cache) return false;
  if (!packageUpdatedAt) return false;
  return cache.packageUpdatedAt === packageUpdatedAt;
}
