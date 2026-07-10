import "server-only";

import { loadManifest } from "./store";
import type { BroadcastCollectionManifest, RvbaSlideAsset } from "./types";

export { slideMediaUrl } from "./media-url";

const manifestCache = new Map<string, BroadcastCollectionManifest>();

/** Manifests rarely change mid-request; a tiny in-memory cache avoids
 * re-reading the same JSON file for every slide in a sequence lookup. */
export async function getCollectionManifest(
  collectionId: string,
  options: { fresh?: boolean } = {},
): Promise<BroadcastCollectionManifest | null> {
  if (!options.fresh && manifestCache.has(collectionId)) {
    return manifestCache.get(collectionId)!;
  }
  const manifest = await loadManifest(collectionId);
  if (manifest) manifestCache.set(collectionId, manifest);
  else manifestCache.delete(collectionId);
  return manifest;
}

export function invalidateManifestCache(collectionId?: string): void {
  if (collectionId) manifestCache.delete(collectionId);
  else manifestCache.clear();
}

/** Every RVBA id built by this importer encodes its collection
 * (`RVBA-{COLLECTION}-{seq}`), so a lookup by id only needs to scan that
 * one collection's manifest — no global RVBA index required. */
function collectionIdFromRvbaId(rvbaId: string): string | null {
  const match = rvbaId.match(/^RVBA-([A-Z0-9]+)-\d+$/);
  return match ? match[1]!.toLowerCase() : null;
}

export async function findSlideByRvbaId(
  rvbaId: string,
): Promise<{ collectionId: string; slide: RvbaSlideAsset } | null> {
  const hint = collectionIdFromRvbaId(rvbaId);
  if (!hint) return null;

  // The collection id's slug may differ slightly from the RVBA fragment
  // (hyphens are stripped for the id), so check manifests whose slugified
  // id starts the same way rather than requiring an exact match.
  const { listCollectionSummaries } = await import("./store");
  const summaries = await listCollectionSummaries();
  for (const summary of summaries) {
    const candidateHint = summary.id.replace(/-/g, "");
    if (candidateHint !== hint) continue;
    const manifest = await getCollectionManifest(summary.id);
    const slide = manifest?.slides.find((s) => s.rvbaId === rvbaId);
    if (slide) return { collectionId: summary.id, slide };
  }
  return null;
}
