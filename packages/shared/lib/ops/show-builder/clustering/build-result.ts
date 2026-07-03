import type { ClusterGroup, ClusterMethodId, ClusterRunOptions, ClusterRunResult, ClusterScores } from "./types";
import type { VdjPoolSong } from "../types";
import { averageVector, matchesHaystack, songHaystack, vectorDistance, vectorSimilarity } from "./vectors";
import { scoreRun } from "./evaluate";

export function buildRunResult(
  method: ClusterMethodId,
  year: number,
  options: ClusterRunOptions,
  pool: VdjPoolSong[],
  rawSongCount: number,
  clusters: ClusterGroup[],
  vectors: number[][],
): ClusterRunResult {
  const assignmentByKey = new Map<string, string>();
  for (const cluster of clusters) {
    for (const m of cluster.members) {
      assignmentByKey.set(m.key, cluster.label);
    }
  }

  const debugRows = pool.map((song) => {
    const cluster = assignmentByKey.get(song.key) ?? "—";
    let notes = "";
    for (const c of clusters) {
      if (c.label !== cluster) continue;
      if (c.seedSong?.key === song.key) notes = "seed";
      else if (c.outliers?.some((o) => o.key === song.key)) notes = "outlier (reassigned)";
    }
    return {
      cluster,
      artist: song.artist,
      title: song.title,
      method,
      notes,
    };
  });

  const scores = scoreRun(year, pool, clusters, vectors);

  return {
    method,
    year,
    passId: options.passId,
    options,
    songCount: rawSongCount,
    uniqueSongCount: pool.length,
    clusters,
    debugRows,
    scores,
  };
}

/** Map full pool (with dupes) to cluster labels from deduped result. */
export function expandToFullPool(
  allSongs: VdjPoolSong[],
  result: ClusterRunResult,
): ClusterRunResult {
  const byIdentity = new Map<string, string>();
  for (const row of result.debugRows) {
    const song = result.clusters.flatMap((c) => c.members).find(
      (m) => m.artist === row.artist && m.title === row.title,
    );
    if (song) byIdentity.set(`${row.artist.toLowerCase()}|${row.title.toLowerCase()}`, row.cluster);
  }

  const debugRows = allSongs.map((song) => {
    const id = `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
    const cluster = byIdentity.get(id) ?? "—";
    const seedNote = result.clusters.find(
      (c) =>
        c.label === cluster &&
        c.seedSong &&
        c.seedSong.artist.toLowerCase() === song.artist.toLowerCase() &&
        c.seedSong.title.toLowerCase() === song.title.toLowerCase(),
    );
    return {
      cluster,
      artist: song.artist,
      title: song.title,
      method: result.method,
      notes: seedNote ? "seed" : "",
    };
  });

  return { ...result, songCount: allSongs.length, debugRows };
}
