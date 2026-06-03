import type { VdjPoolSong } from "./types";

const LEGACY_KEY = /^(\d{4}):(.+)$/;

/** Map old `${year}:${path}` keys to unique `${year}#${idx}` catalog keys. */
export function resolveSongKey(
  key: string,
  catalog: Map<string, VdjPoolSong>,
  pools: Record<number, VdjPoolSong[]>,
): string {
  if (catalog.has(key)) return key;
  const legacy = LEGACY_KEY.exec(key);
  if (!legacy) return key;
  const year = Number(legacy[1]);
  const path = legacy[2];
  const matches = (pools[year] ?? []).filter((s) => s.path === path);
  if (matches.length > 0) return matches[0].key;
  return key;
}

export function migrateLegacySongKeys(
  assignments: Record<string, string>,
  songOrder: Record<string, string[]>,
  catalog: Map<string, VdjPoolSong>,
  pools: Record<number, VdjPoolSong[]>,
): { assignments: Record<string, string>; songOrder: Record<string, string[]>; changed: boolean } {
  let changed = false;
  const nextAssignments: Record<string, string> = {};
  for (const [key, setId] of Object.entries(assignments)) {
    const resolved = resolveSongKey(key, catalog, pools);
    if (resolved !== key) changed = true;
    nextAssignments[resolved] = setId;
  }

  const nextOrder: Record<string, string[]> = {};
  for (const [setId, keys] of Object.entries(songOrder)) {
    nextOrder[setId] = keys.map((key) => {
      const resolved = resolveSongKey(key, catalog, pools);
      if (resolved !== key) changed = true;
      return resolved;
    });
  }

  return { assignments: nextAssignments, songOrder: nextOrder, changed };
}
