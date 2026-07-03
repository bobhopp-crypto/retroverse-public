import type { CrateBuilderFile, CrateSet } from "./types";

export function emptySetOrder(sets: CrateSet[]): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const s of sets) order[s.id] = [];
  return order;
}

export function syncSetOrder(file: CrateBuilderFile): void {
  const setIds = new Set(file.sets.map((s) => s.id));
  if (!file.setOrder || typeof file.setOrder !== "object") {
    file.setOrder = emptySetOrder(file.sets);
  }

  for (const s of file.sets) {
    if (!Array.isArray(file.setOrder[s.id])) file.setOrder[s.id] = [];
  }

  for (const id of Object.keys(file.setOrder)) {
    if (!setIds.has(id)) delete file.setOrder[id];
  }

  const keysBySet = new Map<string, string[]>();
  for (const s of file.sets) keysBySet.set(s.id, []);

  for (const [key, setId] of Object.entries(file.assignments)) {
    const list = keysBySet.get(setId);
    if (list) list.push(key);
  }

  for (const s of file.sets) {
    const assigned = new Set(keysBySet.get(s.id) ?? []);
    const prev = file.setOrder[s.id] ?? [];
    const next = prev.filter((k) => assigned.has(k));
    for (const k of assigned) {
      if (!next.includes(k)) next.push(k);
    }
    file.setOrder[s.id] = next;
  }
}

export function insertIntoSetOrder(
  order: string[],
  songKey: string,
  insertBefore: string | null,
): string[] {
  const next = order.filter((k) => k !== songKey);
  if (insertBefore && next.includes(insertBefore)) {
    const idx = next.indexOf(insertBefore);
    next.splice(idx, 0, songKey);
  } else {
    next.push(songKey);
  }
  return next;
}

export function removeFromAllSetOrders(
  setOrder: Record<string, string[]>,
  songKey: string,
): void {
  for (const id of Object.keys(setOrder)) {
    setOrder[id] = setOrder[id].filter((k) => k !== songKey);
  }
}
