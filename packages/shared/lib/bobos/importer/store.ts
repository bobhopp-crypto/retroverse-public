import "server-only";

import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type {
  BroadcastCollectionManifest,
  BroadcastCollectionSummary,
} from "./types";

/* ── Storage: RETROVERSE_DATA/ops/bobos/broadcast-collections/ ── */

export function broadcastCollectionsRoot(): string {
  return join(opsStateDir(), "bobos", "broadcast-collections");
}

export function collectionDir(collectionId: string): string {
  return join(broadcastCollectionsRoot(), collectionId);
}

export function collectionMastersDir(collectionId: string): string {
  return join(collectionDir(collectionId), "masters");
}

export function collectionThumbsDir(collectionId: string): string {
  return join(collectionDir(collectionId), "thumbs");
}

function manifestPath(collectionId: string): string {
  return join(collectionDir(collectionId), "manifest.json");
}

export async function saveManifest(manifest: BroadcastCollectionManifest): Promise<void> {
  await mkdir(collectionDir(manifest.id), { recursive: true });
  await writeFile(manifestPath(manifest.id), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function loadManifest(collectionId: string): Promise<BroadcastCollectionManifest | null> {
  try {
    const raw = await readFile(manifestPath(collectionId), "utf8");
    return JSON.parse(raw) as BroadcastCollectionManifest;
  } catch {
    return null;
  }
}

/** Every imported collection, discovered by scanning for manifest.json files
 * — no separate index file to keep in sync by hand. */
export async function listCollectionSummaries(): Promise<BroadcastCollectionSummary[]> {
  const root = broadcastCollectionsRoot();
  let entries: string[] = [];
  try {
    entries = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }

  const summaries: BroadcastCollectionSummary[] = [];
  for (const id of entries) {
    const manifest = await loadManifest(id);
    if (!manifest) continue;
    summaries.push({
      id: manifest.id,
      title: manifest.title,
      slideCount: manifest.slides.length,
      sequenceCount: manifest.sequences.length,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
      sourceKind: manifest.sourceKind,
    });
  }
  return summaries.sort((a, b) => a.title.localeCompare(b.title));
}
