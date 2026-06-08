import { emptySetOrder } from "./order";
import type { CrateDealSummary, CrateSet, CrateSong } from "./types";

export const PILE_COUNT = 10;

export function computePileTargets(total: number, pileCount: number = PILE_COUNT): number[] {
  const base = Math.floor(total / pileCount);
  const remainder = total % pileCount;
  return Array.from({ length: pileCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function clusterHomePile(clusterId: string, pileCount: number): number {
  let hash = 0;
  for (let i = 0; i < clusterId.length; i++) {
    hash = (hash * 31 + clusterId.charCodeAt(i)) >>> 0;
  }
  return hash % pileCount;
}

function pilesByProximity(home: number, pileCount: number): number[] {
  const order = [home];
  for (let d = 1; d < pileCount; d++) {
    if (home - d >= 0) order.push(home - d);
    if (home + d < pileCount) order.push(home + d);
  }
  return order;
}

function sortSongsForDeal(songs: CrateSong[]): CrateSong[] {
  const clusterSizes = new Map<string, number>();
  for (const song of songs) {
    const cid = song.cluster?.clusterId ?? "__none__";
    clusterSizes.set(cid, (clusterSizes.get(cid) ?? 0) + 1);
  }

  return [...songs].sort((a, b) => {
    const ca = a.cluster?.clusterId ?? "__none__";
    const cb = b.cluster?.clusterId ?? "__none__";
    const sizeDiff = (clusterSizes.get(cb) ?? 0) - (clusterSizes.get(ca) ?? 0);
    if (sizeDiff !== 0) return sizeDiff;
    if (ca !== cb) return ca.localeCompare(cb);
    return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
  });
}

function pickPileIndex(
  proximity: number[],
  pileCounts: number[],
  targets: number[],
): number {
  let picked = proximity[0]!;
  let bestScore = -Infinity;

  for (const p of proximity) {
    const count = pileCounts[p] ?? 0;
    const target = targets[p] ?? 0;
    const room = target - count;
    const score = room > 0 ? room * 1000 - count : -count;
    if (score > bestScore) {
      bestScore = score;
      picked = p;
    }
  }

  return picked;
}

export function dealUnassignedSongs(
  allSongs: CrateSong[],
  sets: CrateSet[],
  existingAssignments: Record<string, string>,
): {
  assignments: Record<string, string>;
  setOrder: Record<string, string[]>;
} {
  const pileCount = sets.length;
  const assignments: Record<string, string> = { ...existingAssignments };
  const pileKeys: string[][] = sets.map(() => []);
  const pileCounts = sets.map(() => 0);

  for (let i = 0; i < sets.length; i++) {
    const setId = sets[i]!.id;
    for (const [key, assignedSetId] of Object.entries(assignments)) {
      if (assignedSetId !== setId) continue;
      pileKeys[i]!.push(key);
      pileCounts[i]! += 1;
    }
  }

  const toDeal = sortSongsForDeal(allSongs.filter((song) => !assignments[song.key]));
  const targets = computePileTargets(allSongs.length, pileCount);

  for (const song of toDeal) {
    const clusterId = song.cluster?.clusterId ?? "__none__";
    const home = clusterHomePile(clusterId, pileCount);
    const proximity = pilesByProximity(home, pileCount);
    const picked = pickPileIndex(proximity, pileCounts, targets);

    assignments[song.key] = sets[picked]!.id;
    pileKeys[picked]!.push(song.key);
    pileCounts[picked]! += 1;
  }

  const setOrder = emptySetOrder(sets);
  for (let i = 0; i < sets.length; i++) {
    setOrder[sets[i]!.id] = pileKeys[i]!;
  }

  return { assignments, setOrder };
}

export function buildDealSummary(
  songs: CrateSong[],
  sets: CrateSet[],
  assignments: Record<string, string>,
): CrateDealSummary {
  const pileCounts: Record<string, number> = {};
  const pileLabels: Record<string, string> = {};
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]!;
    pileCounts[set.id] = 0;
    pileLabels[set.id] = set.name.trim() || `Pile ${i + 1}`;
  }

  const clusterMap = new Map<string, Record<string, number>>();

  for (const song of songs) {
    const setId = assignments[song.key];
    if (!setId) continue;
    pileCounts[setId] = (pileCounts[setId] ?? 0) + 1;

    const clusterId = song.cluster?.clusterId ?? "__none__";
    if (!clusterMap.has(clusterId)) clusterMap.set(clusterId, {});
    const pileSplit = clusterMap.get(clusterId)!;
    pileSplit[setId] = (pileSplit[setId] ?? 0) + 1;
  }

  const clusterDistribution = [...clusterMap.entries()]
    .map(([clusterId, pileSplit]) => ({
      clusterId,
      total: Object.values(pileSplit).reduce((sum, n) => sum + n, 0),
      pileCounts: pileSplit,
    }))
    .sort((a, b) => b.total - a.total);

  return { pileCounts, pileLabels, clusterDistribution };
}
