import { existsSync } from "fs";
import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

function resolveRepoDataPath(...segments: string[]): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, "data", ...segments);
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), "data", ...segments);
}

export function intelligenceRoot(): string {
  return join(retroverseDataRoot(), "ops", "intelligence");
}

/** Canonical BobOS public song-package store (not ops/). */
export function songPackagesDir(): string {
  return join(retroverseDataRoot(), "bobos", "song-packages");
}

export function bundledIntelligenceRoot(): string {
  return join(process.cwd(), "data", "ops", "intelligence");
}

export function bundledSongPackagesDir(): string {
  return resolveRepoDataPath("bobos", "song-packages");
}

export function bundledSongPackagePath(rvtr: string): string {
  return join(bundledSongPackagesDir(), `${rvtr.trim().toUpperCase()}.json`);
}

export function bundledSongPackageIndexPath(): string {
  return join(bundledSongPackagesDir(), "index.json");
}

export function bundledVdjRvtrIndexPath(): string {
  return resolveRepoDataPath("ops", "vdj-rvtr-index.json");
}

export function bundledDeckIndexPath(): string {
  return join(bundledIntelligenceRoot(), "deck-index.json");
}

export function songPackagePath(rvtr: string): string {
  return join(songPackagesDir(), `${rvtr.trim().toUpperCase()}.json`);
}

export function songPackageDir(rvtr: string): string {
  return join(songPackagesDir(), rvtr.trim().toUpperCase());
}

export function publicExhibitPath(rvtr: string): string {
  return join(songPackageDir(rvtr), "experience.json");
}

export function bundledSongPackageDir(rvtr: string): string {
  return join(bundledSongPackagesDir(), rvtr.trim().toUpperCase());
}

export function bundledPublicExhibitPath(rvtr: string): string {
  return join(bundledSongPackageDir(rvtr), "experience.json");
}

export function songPackageIndexPath(): string {
  return join(songPackagesDir(), "index.json");
}

export function batchStatusPath(): string {
  return join(intelligenceRoot(), "batch-status.json");
}

export function backfillQueuePath(): string {
  return join(intelligenceRoot(), "backfill-queue.json");
}

export function backfillStatePath(): string {
  return join(intelligenceRoot(), "backfill-state.json");
}

export function coverRecoveryQueuePath(): string {
  return join(intelligenceRoot(), "cover-recovery-queue.json");
}

export function researchVaultDir(rvtr: string): string {
  return join(intelligenceRoot(), "research", rvtr.trim().toUpperCase());
}
