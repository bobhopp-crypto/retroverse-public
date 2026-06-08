import type { VdjPoolSong } from "@/lib/ops/show-builder/types";

/** Stable identity for artist+title (case-insensitive). */
export function songIdentity(artist: string, title: string): string {
  const a = artist.trim().toLowerCase().replace(/\s+/g, " ");
  const t = title.trim().toLowerCase().replace(/\s+/g, " ");
  return `${a}|${t}`;
}

export function crateSongKey(year: number, artist: string, title: string): string {
  return `${year}:${songIdentity(artist, title)}`;
}

export type DedupeResult = {
  songs: VdjPoolSong[];
  /** Rows in source MyLists file before dedupe. */
  sourceRowCount: number;
  /** Rows removed (same artist+title). */
  duplicateCount: number;
};

/**
 * MyLists .vdjfolder can list the same artist+title on multiple file paths
 * (BW vs color, alternate folders, re-imports). Crate Builder shows one card each.
 * Keeps the row with highest PlayCount; ties → first in file order.
 */
export function dedupeMyListsPool(songs: VdjPoolSong[]): DedupeResult {
  const sourceRowCount = songs.length;
  const byIdentity = new Map<string, VdjPoolSong>();

  for (const song of songs) {
    const id = songIdentity(song.artist, song.title);
    const existing = byIdentity.get(id);
    if (!existing) {
      byIdentity.set(id, song);
      continue;
    }
    const pcNew = song.playCount ?? 0;
    const pcOld = existing.playCount ?? 0;
    if (pcNew > pcOld) byIdentity.set(id, song);
  }

  const unique = [...byIdentity.values()].sort(
    (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
  );

  return {
    songs: unique,
    sourceRowCount,
    duplicateCount: sourceRowCount - unique.length,
  };
}
