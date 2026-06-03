import { runClustering, type ClusterRunResult } from "./clustering";
import { runMethodA } from "./clustering/method-a-cultural";
import { CLUSTER_PALETTE, paletteGlyph } from "./clustering/palette";
import type { VdjPoolSong } from "./types";

export type VisualClusterPaletteEntry = {
  id: string;
  color: string;
  bg: string;
  name: string;
  glyph: string;
};

/** Re-export for UI consumers */
export { CLUSTER_PALETTE };

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

function pickClusterCount(songCount: number): number {
  if (songCount <= 6) return Math.max(2, Math.min(5, songCount));
  if (songCount <= 20) return 5;
  if (songCount <= 35) return 6;
  if (songCount <= 55) return 7;
  return 8;
}

function clusterRunToVisual(run: ClusterRunResult, songs: VdjPoolSong[]): VisualClusterResult {
  const bySongKey = new Map<string, SongClusterHint>();
  const clusters: VisualClusterResult["clusters"] = run.clusters.map((c) => ({
    id: c.id,
    color: c.color,
    bg: c.bg,
    name: c.name,
    glyph: paletteGlyph(c.id),
    label: c.label,
    count: c.count,
  }));

  const byIdentity = new Map<string, SongClusterHint>();
  for (const c of run.clusters) {
    const hint: SongClusterHint = {
      clusterId: c.id,
      color: c.color,
      bg: c.bg,
      name: c.name,
      glyph: paletteGlyph(c.id),
      label: c.label,
    };
    for (const m of c.members) {
      byIdentity.set(`${m.artist.toLowerCase()}|${m.title.toLowerCase()}`, hint);
    }
  }
  for (const song of songs) {
    const id = `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
    const hint = byIdentity.get(id);
    if (hint) bySongKey.set(song.key, hint);
  }

  return { clusters, bySongKey };
}

/** Visual-only cluster hints. Neutral letters only — no genre taxonomy. */
export function clusterPoolSongs(songs: VdjPoolSong[]): VisualClusterResult {
  if (songs.length === 0) {
    return { clusters: [], bySongKey: new Map() };
  }
  const year = songs[0]?.year ?? 0;
  const run = runMethodA(songs, year, {
    passId: "default",
    k: pickClusterCount(songs.length),
    mergeMinSize: 3,
    mergeMinClusters: 5,
  });
  return clusterRunToVisual(run, songs);
}

export type CompareClusterResult = VisualClusterResult & {
  method: "A" | "B" | "C";
  passId: string;
  scores?: ClusterRunResult["scores"];
  seeds?: Array<{ cluster: string; artist: string; title: string }>;
  debugRows?: ClusterRunResult["debugRows"];
};

/** Dev compare mode: run Method A, B, or C for active year. */
export function clusterPoolSongsWithMethod(
  songs: VdjPoolSong[],
  method: "A" | "B" | "C",
  options?: {
    passId?: string;
    k?: number;
    outlierThreshold?: number;
    seedCount?: number;
  },
): CompareClusterResult {
  if (songs.length === 0) {
    return { clusters: [], bySongKey: new Map(), method, passId: "empty" };
  }
  const year = songs[0]?.year ?? 0;
  const defaults =
    method === "A"
      ? { k: pickClusterCount(songs.length), mergeMinSize: 3, mergeMinClusters: 5 }
      : method === "B"
        ? { outlierThreshold: 0.42, minClusterSize: 3, k: 7 }
        : { seedCount: pickClusterCount(songs.length), k: pickClusterCount(songs.length) };

  const run = runClustering(method, songs, year, {
    passId: options?.passId ?? "compare",
    ...defaults,
    ...options,
  });
  const visual = clusterRunToVisual(run, songs);
  const seeds = run.clusters
    .filter((c) => c.seedSong)
    .map((c) => ({
      cluster: c.label,
      artist: c.seedSong!.artist,
      title: c.seedSong!.title,
    }));
  return {
    ...visual,
    method,
    passId: run.passId,
    scores: run.scores,
    seeds,
    debugRows: run.debugRows,
  };
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
