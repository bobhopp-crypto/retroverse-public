import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

import {
  ensureHarvestLibraryLayout,
  harvestLibraryRoot,
  harvestManifestPath,
} from "./paths";

import type { HarvestVdjMetadata } from "./clip-metadata";

export type HarvestClipEntry = {
  id: string;
  title: string;
  type: string;
  sourceProgram: string;
  sourceFile: string;
  inSec: number;
  outSec: number;
  durationSec: number;
  exportedAt: string;
  chapterId: string;
  exportedPath: string;
  jobSlug?: string;
  year?: number;
  /** VirtualDJ metadata written to MP4 + preserved for re-index. */
  vdj?: HarvestVdjMetadata;
};

export type HarvestManifest = {
  version: 1;
  libraryRoot: string;
  clips: HarvestClipEntry[];
};

export type HarvestTypeGroup = {
  type: string;
  count: number;
  clips: HarvestClipEntry[];
};

function emptyManifest(root: string): HarvestManifest {
  return { version: 1, libraryRoot: root, clips: [] };
}

export async function readHarvestManifest(): Promise<HarvestManifest> {
  const root = harvestLibraryRoot();
  const path = harvestManifestPath();
  if (!existsSync(path)) {
    return emptyManifest(root);
  }
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as Partial<HarvestManifest>;
    return {
      version: 1,
      libraryRoot: raw.libraryRoot?.trim() || root,
      clips: Array.isArray(raw.clips) ? raw.clips : [],
    };
  } catch {
    return emptyManifest(root);
  }
}

export async function writeHarvestManifest(manifest: HarvestManifest): Promise<void> {
  await ensureHarvestLibraryLayout();
  await writeFile(harvestManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function appendHarvestClips(entries: HarvestClipEntry[]): Promise<HarvestManifest> {
  const manifest = await readHarvestManifest();
  manifest.libraryRoot = harvestLibraryRoot();
  const byPath = new Map(manifest.clips.map((c) => [c.exportedPath, c]));
  for (const entry of entries) {
    byPath.set(entry.exportedPath, entry);
  }
  manifest.clips = [...byPath.values()].sort(
    (a, b) => Date.parse(b.exportedAt) - Date.parse(a.exportedAt),
  );
  await writeHarvestManifest(manifest);
  return manifest;
}

export function groupManifestByType(manifest: HarvestManifest): HarvestTypeGroup[] {
  const groups = new Map<string, HarvestClipEntry[]>();
  for (const clip of manifest.clips) {
    const type = clip.type.trim() || "Other";
    const list = groups.get(type) ?? [];
    list.push(clip);
    groups.set(type, list);
  }
  return [...groups.entries()]
    .map(([type, clips]) => ({
      type,
      count: clips.length,
      clips: clips.sort((a, b) => Date.parse(b.exportedAt) - Date.parse(a.exportedAt)),
    }))
    .sort((a, b) => b.count - a.count);
}

export function newHarvestClipId(): string {
  return randomUUID();
}
