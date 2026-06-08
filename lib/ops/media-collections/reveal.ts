import { access } from "fs/promises";
import { resolve } from "path";

import { openInFinder } from "@/lib/ops/media-lab/open-local";

import { collectionDir, collectionSubdir, mediaCollectionsRoot } from "./paths";

export type CollectionRevealTarget =
  | "root"
  | "downloads"
  | "episodes"
  | "metadata"
  | "transcripts";

function isUnderMediaCollections(absPath: string): boolean {
  const root = resolve(mediaCollectionsRoot());
  const resolved = resolve(absPath);
  return resolved === root || resolved.startsWith(root + "/");
}

export function resolveCollectionRevealPath(
  collectionId: string,
  target: CollectionRevealTarget,
): string {
  if (target === "root") return collectionDir(collectionId);
  return collectionSubdir(collectionId, target);
}

export async function revealCollectionPath(
  collectionId: string,
  target: CollectionRevealTarget,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const path = resolveCollectionRevealPath(collectionId, target);

  if (!isUnderMediaCollections(path)) {
    return { ok: false, error: "Path is outside media collections root." };
  }

  try {
    await access(path);
  } catch {
    return { ok: false, error: "Folder not found. Run Scan or create the collection first." };
  }

  const result = await openInFinder(path);
  if (!result.ok) return result;
  return { ok: true, path };
}
