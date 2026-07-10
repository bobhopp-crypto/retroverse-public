import "server-only";

import { invalidateManifestCache } from "./lookup";
import { loadManifest, saveManifest } from "./store";
import type { BroadcastSequence } from "./types";

/** Replace a collection's sequence list — how the inline sequence editor
 * saves operator corrections to the auto-detected first pass. Slides
 * themselves are never touched here. */
export async function updateCollectionSequences(
  collectionId: string,
  sequences: BroadcastSequence[],
): Promise<void> {
  const manifest = await loadManifest(collectionId);
  if (!manifest) throw new Error(`Unknown broadcast collection: ${collectionId}`);

  const normalized = sequences.map((sequence) => ({
    ...sequence,
    slideCount: sequence.endSlide - sequence.startSlide + 1,
    autoDetected: false,
  }));

  await saveManifest({ ...manifest, sequences: normalized, updatedAt: new Date().toISOString() });
  invalidateManifestCache(collectionId);
}
