import type { VdjPoolSong } from "./types";

export function insertIntoOrder(
  order: string[],
  workspaceKey: string,
  insertBefore: string | null,
): string[] {
  const next = order.filter((k) => k !== workspaceKey);
  if (insertBefore && next.includes(insertBefore)) {
    const idx = next.indexOf(insertBefore);
    next.splice(idx, 0, workspaceKey);
  } else {
    next.push(workspaceKey);
  }
  return next;
}

export function removeFromAllOrders(
  songOrder: Record<string, string[]>,
  workspaceKey: string,
): void {
  for (const id of Object.keys(songOrder)) {
    songOrder[id] = songOrder[id].filter((k) => k !== workspaceKey);
  }
}

export function songsInSet(
  setId: string,
  catalog: Map<string, VdjPoolSong>,
  assignments: Record<string, string>,
  songOrder: Record<string, string[]>,
): VdjPoolSong[] {
  const out: VdjPoolSong[] = [];
  const seen = new Set<string>();
  for (const key of songOrder[setId] ?? []) {
    if (assignments[key] !== setId) continue;
    const song = catalog.get(key);
    if (song) {
      out.push(song);
      seen.add(key);
    }
  }
  for (const [key, sid] of Object.entries(assignments)) {
    if (sid !== setId || seen.has(key)) continue;
    const song = catalog.get(key);
    if (song) out.push(song);
  }
  return out;
}

export function syncSongOrder(
  sets: Array<{ id: string }>,
  assignments: Record<string, string>,
  songOrder: Record<string, string[]>,
): void {
  for (const s of sets) {
    if (!Array.isArray(songOrder[s.id])) songOrder[s.id] = [];
  }
  const keysBySet = new Map<string, Set<string>>();
  for (const s of sets) keysBySet.set(s.id, new Set());

  for (const [key, setId] of Object.entries(assignments)) {
    keysBySet.get(setId)?.add(key);
  }

  for (const s of sets) {
    const assigned = keysBySet.get(s.id) ?? new Set();
    const prev = songOrder[s.id] ?? [];
    const next = prev.filter((k) => assigned.has(k));
    for (const k of assigned) {
      if (!next.includes(k)) next.push(k);
    }
    songOrder[s.id] = next;
  }
}
