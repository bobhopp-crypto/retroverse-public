import { readdir, stat } from "fs/promises";
import { join } from "path";

import type { CollectionStorageStats } from "./types";
import { collectionSubdir } from "./paths";

async function dirStats(absDir: string): Promise<{ count: number; bytes: number }> {
  let count = 0;
  let bytes = 0;

  try {
    const entries = await readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = join(absDir, entry.name);
      if (entry.isDirectory()) {
        const nested = await dirStats(full);
        count += nested.count;
        bytes += nested.bytes;
      } else if (entry.isFile()) {
        count += 1;
        try {
          const info = await stat(full);
          bytes += info.size;
        } catch {
          // skip unreadable files
        }
      }
    }
  } catch {
    return { count: 0, bytes: 0 };
  }

  return { count, bytes };
}

export async function loadCollectionStorageStats(
  collectionId: string,
): Promise<CollectionStorageStats> {
  const [downloads, metadata, transcripts] = await Promise.all([
    dirStats(collectionSubdir(collectionId, "downloads")),
    dirStats(collectionSubdir(collectionId, "metadata")),
    dirStats(collectionSubdir(collectionId, "transcripts")),
  ]);

  return {
    downloads_file_count: downloads.count,
    downloads_bytes: downloads.bytes,
    metadata_file_count: metadata.count,
    transcripts_file_count: transcripts.count,
    total_bytes: downloads.bytes + metadata.bytes + transcripts.bytes,
  };
}
