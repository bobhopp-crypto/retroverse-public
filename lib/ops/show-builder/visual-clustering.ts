import { associationVector1967 } from "./cultural-association-1967";
import type { VdjPoolSong } from "./types";

export type VisualClusterPaletteEntry = {
  id: string;
  color: string;
  bg: string;
  name: string;
  glyph: string;
};

export type SongClusterHint = {
  clusterId: string;
  color: string;
  bg: string;
  name: string;
  glyph: string;
  /** Neutral label only, e.g. "Cluster A" */
  label: string;
};

export type VisualClusterResult = {
  clusters: Array<{
    id: string;
    color: string;
    bg: string;
    name: string;
    glyph: string;
    label: string;
    count: number;
  }>;
  bySongKey: Map<string, SongClusterHint>;
};

/** Stable scan palette — suggestions only, never persisted. */
export const CLUSTER_PALETTE: VisualClusterPaletteEntry[] = [
  { id: "green", color: "#1f8f4a", bg: "#2ecc71", name: "Green", glyph: "🟩" },
  { id: "purple", color: "#6b21a8", bg: "#a855f7", name: "Purple", glyph: "🟪" },
  { id: "gold", color: "#92600a", bg: "#f0b429", name: "Gold", glyph: "🟨" },
  { id: "blue", color: "#1d4ed8", bg: "#3b9eff", name: "Blue", glyph: "🟦" },
  { id: "pink", color: "#be185d", bg: "#ff6eb4", name: "Pink", glyph: "🩷" },
  { id: "orange", color: "#c2410c", bg: "#ff9f43", name: "Orange", glyph: "🟧" },
  { id: "teal", color: "#0f766e", bg: "#2eb8b8", name: "Teal", glyph: "🩵" },
  { id: "red", color: "#b91c1c", bg: "#ef4444", name: "Red", glyph: "🟥" },
];

const CLUSTER_LETTERS = "ABCDEFGH";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function songFeatureVector(song: VdjPoolSong): number[] {
  if (song.year === 1967) {
    return associationVector1967(song);
  }
  // Non-1967: artist/title token vector only (no genre lexicons)
  const text = normalizeText(`${song.artist} ${song.title}`);
  const tokens = text.split(" ").filter((t) => t.length > 2);
  const dims = 12;
  const vec = new Array(dims).fill(0);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i += 1) h = (h * 31 + token.charCodeAt(i)) % dims;
    vec[h] += 1;
  }
  const artistKey = normalizeText(song.artist);
  vec[dims - 1] = [...artistKey].reduce((n, c) => n + c.charCodeAt(0), 0) % 7;
  const sum = vec.reduce((a, b) => a + b, 0) || 1;
  return vec.map((v) => v / sum);
}

function vectorDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function averageVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i += 1) out[i] += v[i];
  }
  return out.map((v) => v / vectors.length);
}

function pickClusterCount(songCount: number): number {
  if (songCount <= 6) return Math.max(2, Math.min(5, songCount));
  if (songCount <= 20) return 5;
  if (songCount <= 35) return 6;
  if (songCount <= 55) return 7;
  return 8;
}

function clusterCentroid(vectors: number[][], assignments: number[], clusterId: number): number[] {
  const members = vectors.filter((_, i) => assignments[i] === clusterId);
  return averageVector(members);
}

/** Fold tiny groups into nearest neighbor so palette stays readable (5–8 clusters). */
function mergeSmallClusters(
  vectors: number[][],
  assignments: number[],
  minSize: number,
  minClusters: number,
): number[] {
  let next = [...assignments];

  while (true) {
    const sizes = new Map<number, number>();
    for (const a of next) sizes.set(a, (sizes.get(a) ?? 0) + 1);

    if (sizes.size <= minClusters) break;

    let mergeFrom = -1;
    let mergeSize = Infinity;
    for (const [clusterId, size] of sizes) {
      if (size < minSize && size < mergeSize) {
        mergeSize = size;
        mergeFrom = clusterId;
      }
    }
    if (mergeFrom < 0) break;

    const fromCentroid = clusterCentroid(vectors, next, mergeFrom);
    let mergeInto = -1;
    let bestDist = Infinity;
    for (const clusterId of sizes.keys()) {
      if (clusterId === mergeFrom) continue;
      const d = vectorDistance(fromCentroid, clusterCentroid(vectors, next, clusterId));
      if (d < bestDist) {
        bestDist = d;
        mergeInto = clusterId;
      }
    }
    if (mergeInto < 0) break;

    next = next.map((a) => (a === mergeFrom ? mergeInto : a));
  }

  return next;
}

function clusterLetter(index: number): string {
  return `Cluster ${CLUSTER_LETTERS[index] ?? String(index + 1)}`;
}

function kMeansAssign(vectors: number[][], k: number): number[] {
  if (vectors.length === 0) return [];
  const kClamped = Math.min(k, vectors.length);
  const centroids: number[][] = [];
  const used = new Set<number>();
  centroids.push([...vectors[0]]);
  used.add(0);
  while (centroids.length < kClamped) {
    let bestIdx = -1;
    let bestDist = -1;
    for (let i = 0; i < vectors.length; i += 1) {
      if (used.has(i)) continue;
      const nearest = Math.min(...centroids.map((c) => vectorDistance(c, vectors[i])));
      if (nearest > bestDist) {
        bestDist = nearest;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    centroids.push([...vectors[bestIdx]]);
    used.add(bestIdx);
  }

  const assignments = new Array(vectors.length).fill(0);
  for (let iter = 0; iter < 16; iter += 1) {
    for (let i = 0; i < vectors.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c += 1) {
        const d = vectorDistance(centroids[c], vectors[i]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }
    for (let c = 0; c < centroids.length; c += 1) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length > 0) centroids[c] = averageVector(members);
    }
  }
  return assignments;
}

/** Visual-only cluster hints. Neutral letters only — no genre taxonomy. */
export function clusterPoolSongs(songs: VdjPoolSong[]): VisualClusterResult {
  const bySongKey = new Map<string, SongClusterHint>();
  if (songs.length === 0) {
    return { clusters: [], bySongKey };
  }

  const vectors = songs.map(songFeatureVector);
  const k = pickClusterCount(songs.length);
  let assignments = kMeansAssign(vectors, k);
  assignments = mergeSmallClusters(vectors, assignments, 3, 5);

  const groups = new Map<number, number[]>();
  for (let i = 0; i < assignments.length; i += 1) {
    const g = assignments[i];
    const list = groups.get(g) ?? [];
    list.push(i);
    groups.set(g, list);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const clusters: VisualClusterResult["clusters"] = [];

  sortedGroups.forEach(([, memberIdx], paletteIdx) => {
    const palette = CLUSTER_PALETTE[paletteIdx % CLUSTER_PALETTE.length];
    const label = clusterLetter(paletteIdx);
    const clusterId = `${palette.id}-${label.replace(" ", "-").toLowerCase()}`;
    clusters.push({
      id: clusterId,
      color: palette.color,
      bg: palette.bg,
      name: palette.name,
      glyph: palette.glyph,
      label,
      count: memberIdx.length,
    });
    for (const i of memberIdx) {
      bySongKey.set(songs[i].key, {
        clusterId,
        color: palette.color,
        bg: palette.bg,
        name: palette.name,
        glyph: palette.glyph,
        label,
      });
    }
  });

  return { clusters, bySongKey };
}

function sortSongs(songs: VdjPoolSong[]): VdjPoolSong[] {
  return [...songs].sort(
    (a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist),
  );
}

/** Group unassigned pool songs by cluster, sorted for visual scanning. */
export function groupPoolByCluster(
  unassigned: VdjPoolSong[],
  result: VisualClusterResult,
): Array<{ cluster: VisualClusterResult["clusters"][number]; songs: VdjPoolSong[] }> {
  const byCluster = new Map<string, VdjPoolSong[]>();
  for (const song of unassigned) {
    const clusterId = result.bySongKey.get(song.key)?.clusterId ?? "__none__";
    const list = byCluster.get(clusterId) ?? [];
    list.push(song);
    byCluster.set(clusterId, list);
  }

  const groups = result.clusters
    .map((cluster) => ({
      cluster,
      songs: sortSongs(byCluster.get(cluster.id) ?? []),
    }))
    .filter((g) => g.songs.length > 0);

  const leftover = sortSongs(byCluster.get("__none__") ?? []);
  if (leftover.length > 0) {
    groups.push({
      cluster: {
        id: "__none__",
        color: "#64748b",
        bg: "#94a3b8",
        name: "Gray",
        glyph: "⬜",
        label: "Cluster ?",
        count: leftover.length,
      },
      songs: leftover,
    });
  }

  return groups;
}

/** Dev evaluation: full pool membership for active year. */
export function clusterMembershipReport(
  songs: VdjPoolSong[],
  result: VisualClusterResult,
): Array<{ cluster: string; artist: string; title: string }> {
  return sortSongs(songs).map((song) => ({
    cluster: result.bySongKey.get(song.key)?.label ?? "—",
    artist: song.artist,
    title: song.title,
  }));
}
