import { access } from "fs/promises";

import { collectionsIndexPath } from "./paths";
import { seedMediaCollections } from "./seed";

/** Ensure media collections data exists on first ops access. */
export async function ensureMediaCollectionsInitialized(): Promise<void> {
  try {
    await access(collectionsIndexPath());
  } catch {
    await seedMediaCollections();
  }
}
