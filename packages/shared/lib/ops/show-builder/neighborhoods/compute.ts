import { runClustering } from "../clustering";
import type { ClusterMethodId } from "../clustering/types";
import { dedupePool } from "../clustering/types";
import type { VdjPoolSong } from "../types";
import { pickClusterCount, songFeatureVector, vectorSimilarity } from "../clustering/vectors";

export type NeighborEntry = {
  key: string;
  artist: string;
  title: string;
  score: number;
};

export type SongNeighborhood = {
  songKey: string;
  artist: string;
  title: string;
  method: ClusterMethodId;
  neighbors: NeighborEntry[];
  neighborhoodSize: number;
};

export type SongNeighborBundle = {
  songKey: string;
  artist: string;
  title: string;
  byMethod: Record<ClusterMethodId, NeighborEntry[]>;
  neighborhoodSizes: Record<ClusterMethodId, number>;
  overlap: { AB: number; AC: number; BC: number; avg: number };
  stability: number;
  reciprocalCount: number;
  reciprocalPairs: Array<{ a: string; b: string; methods: ClusterMethodId[] }>;
};

export type YearNeighborhoodReport = {
  year: number;
  songCount: number;
  uniqueSongCount: number;
  songs: SongNeighborBundle[];
  topNeighborhoods: Array<{ artist: string; title: string; avgNeighborScore: number; size: number }>;
  mostConnected: Array<{ artist: string; title: string; reciprocalCount: number; overlapAvg: number }>;
  mostIsolated: Array<{ artist: string; title: string; topNeighborScore: number }>;
  strongestReciprocals: Array<{ a: string; b: string; methods: string; score: number }>;
  methodOverlapAvg: { AB: number; AC: number; BC: number };
};

const METHODS: ClusterMethodId[] = ["A", "B", "C"];
const DEFAULT_TOP_K = 10;
const NEIGHBORHOOD_THRESHOLD = 0.38;
const SAME_GROUP_BOOST = 0.14;

function songId(song: VdjPoolSong): string {
  return `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
}

function defaultClusterOptions(method: ClusterMethodId, poolSize: number) {
  const k = pickClusterCount(poolSize);
  if (method === "A") return { passId: "neighbors", k, mergeMinSize: 3, mergeMinClusters: 5 };
  if (method === "B") return { passId: "neighbors", outlierThreshold: 0.42, minClusterSize: 3, k: 7 };
  return { passId: "neighbors", seedCount: k, k };
}

/** Cluster label per deduped song key for a method run. */
function clusterBySongKey(
  pool: VdjPoolSong[],
  method: ClusterMethodId,
  year: number,
): Map<string, string> {
  const run = runClustering(method, pool, year, defaultClusterOptions(method, pool.length));
  const map = new Map<string, string>();
  for (const cluster of run.clusters) {
    for (const m of cluster.members) {
      map.set(`${m.artist.toLowerCase()}|${m.title.toLowerCase()}`, cluster.label);
    }
  }
  return map;
}

function rankNeighbors(
  pool: VdjPoolSong[],
  vectors: number[][],
  sourceIdx: number,
  groupByKey: Map<string, string>,
  topK: number,
): NeighborEntry[] {
  const source = pool[sourceIdx];
  const sourceGroup = groupByKey.get(songId(source));
  const ranked: NeighborEntry[] = [];

  for (let j = 0; j < pool.length; j += 1) {
    if (j === sourceIdx) continue;
    const target = pool[j];
    let score = vectorSimilarity(vectors[sourceIdx], vectors[j]);
    const targetGroup = groupByKey.get(songId(target));
    if (sourceGroup && targetGroup && sourceGroup === targetGroup) {
      score += SAME_GROUP_BOOST;
    }
    ranked.push({
      key: target.key,
      artist: target.artist,
      title: target.title,
      score,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return ranked.slice(0, topK);
}

function neighborhoodSize(vectors: number[][], sourceIdx: number, pool: VdjPoolSong[]): number {
  let count = 0;
  for (let j = 0; j < pool.length; j += 1) {
    if (j === sourceIdx) continue;
    if (vectorSimilarity(vectors[sourceIdx], vectors[j]) >= NEIGHBORHOOD_THRESHOLD) count += 1;
  }
  return count;
}

function jaccardTopK(a: NeighborEntry[], b: NeighborEntry[], k: number): number {
  const setA = new Set(a.slice(0, k).map((n) => `${n.artist.toLowerCase()}|${n.title.toLowerCase()}`));
  const setB = new Set(b.slice(0, k).map((n) => `${n.artist.toLowerCase()}|${n.title.toLowerCase()}`));
  let inter = 0;
  for (const id of setA) {
    if (setB.has(id)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : 0;
}

function reciprocalPairsForSong(
  sourceId: string,
  byMethod: Record<ClusterMethodId, NeighborEntry[]>,
  allBundles: SongNeighborBundle[],
  topK: number,
): Array<{ a: string; b: string; methods: ClusterMethodId[] }> {
  const pairs: Array<{ a: string; b: string; methods: ClusterMethodId[] }> = [];
  const seen = new Set<string>();

  for (const method of METHODS) {
    for (const neighbor of byMethod[method].slice(0, topK)) {
      const neighborId = `${neighbor.artist.toLowerCase()}|${neighbor.title.toLowerCase()}`;
      const pairKey = [sourceId, neighborId].sort().join("||");
      if (seen.has(pairKey)) continue;

      const neighborBundle = allBundles.find(
        (b) => `${b.artist.toLowerCase()}|${b.title.toLowerCase()}` === neighborId,
      );
      if (!neighborBundle) continue;

      const reciprocalMethods: ClusterMethodId[] = [];
      for (const m of METHODS) {
        const hasBack = neighborBundle.byMethod[m].slice(0, topK).some(
          (n) => `${n.artist.toLowerCase()}|${n.title.toLowerCase()}` === sourceId,
        );
        const hasForward = byMethod[m].slice(0, topK).some(
          (n) => `${n.artist.toLowerCase()}|${n.title.toLowerCase()}` === neighborId,
        );
        if (hasForward && hasBack) reciprocalMethods.push(m);
      }

      if (reciprocalMethods.length > 0) {
        seen.add(pairKey);
        pairs.push({ a: sourceId, b: neighborId, methods: reciprocalMethods });
      }
    }
  }

  return pairs;
}

/** Build neighbor lists for all songs using Methods A, B, C. */
export function buildYearNeighborhoods(
  songs: VdjPoolSong[],
  year: number,
  topK = DEFAULT_TOP_K,
): YearNeighborhoodReport {
  const pool = dedupePool(songs);
  const vectors = pool.map(songFeatureVector);

  const groups = {
    A: clusterBySongKey(pool, "A", year),
    B: clusterBySongKey(pool, "B", year),
    C: clusterBySongKey(pool, "C", year),
  };

  const bundles: SongNeighborBundle[] = [];

  for (let i = 0; i < pool.length; i += 1) {
    const song = pool[i];
    const id = songId(song);
    const byMethod = {
      A: rankNeighbors(pool, vectors, i, groups.A, topK),
      B: rankNeighbors(pool, vectors, i, groups.B, topK),
      C: rankNeighbors(pool, vectors, i, groups.C, topK),
    } satisfies Record<ClusterMethodId, NeighborEntry[]>;

    const neighborhoodSizes = {
      A: neighborhoodSize(vectors, i, pool),
      B: neighborhoodSize(vectors, i, pool),
      C: neighborhoodSize(vectors, i, pool),
    };

    const overlapAB = jaccardTopK(byMethod.A, byMethod.B, topK);
    const overlapAC = jaccardTopK(byMethod.A, byMethod.C, topK);
    const overlapBC = jaccardTopK(byMethod.B, byMethod.C, topK);
    const overlapAvg = (overlapAB + overlapAC + overlapBC) / 3;

    bundles.push({
      songKey: song.key,
      artist: song.artist,
      title: song.title,
      byMethod,
      neighborhoodSizes,
      overlap: { AB: overlapAB, AC: overlapAC, BC: overlapBC, avg: overlapAvg },
      stability: overlapAvg,
      reciprocalCount: 0,
      reciprocalPairs: [],
    });
  }

  for (const b of bundles) {
    const id = `${b.artist.toLowerCase()}|${b.title.toLowerCase()}`;
    const reciprocals = reciprocalPairsForSong(id, b.byMethod, bundles, topK);
    b.reciprocalCount = reciprocals.length;
    b.reciprocalPairs = reciprocals.map((p) => ({
      a: p.a,
      b: p.b,
      methods: p.methods,
    }));
  }

  const topNeighborhoods = bundles
    .map((b) => {
      const scores = METHODS.flatMap((m) => b.byMethod[m].map((n) => n.score));
      const avgNeighborScore = scores.length > 0 ? scores.reduce((a, c) => a + c, 0) / scores.length : 0;
      const size = Math.max(...METHODS.map((m) => b.neighborhoodSizes[m]));
      return { artist: b.artist, title: b.title, avgNeighborScore, size };
    })
    .sort((a, b) => b.avgNeighborScore - a.avgNeighborScore || b.size - a.size)
    .slice(0, 10);

  const mostConnected = [...bundles]
    .sort((a, b) => b.reciprocalCount - a.reciprocalCount || b.overlap.avg - a.overlap.avg)
    .slice(0, 10)
    .map((b) => ({
      artist: b.artist,
      title: b.title,
      reciprocalCount: b.reciprocalCount,
      overlapAvg: b.overlap.avg,
    }));

  const mostIsolated = bundles
    .map((b) => {
      const topScores = METHODS.map((m) => b.byMethod[m][0]?.score ?? 0);
      const topNeighborScore = Math.max(...topScores);
      return { artist: b.artist, title: b.title, topNeighborScore };
    })
    .sort((a, b) => a.topNeighborScore - b.topNeighborScore)
    .slice(0, 10);

  // Collect global reciprocal pairs
  const reciprocalMap = new Map<string, { a: string; b: string; methods: Set<ClusterMethodId>; score: number }>();
  for (const b of bundles) {
    for (const method of METHODS) {
      for (const n of b.byMethod[method]) {
        const sourceId = `${b.artist.toLowerCase()}|${b.title.toLowerCase()}`;
        const targetId = `${n.artist.toLowerCase()}|${n.title.toLowerCase()}`;
        const pairKey = [sourceId, targetId].sort().join("||");
        const reverseBundle = bundles.find(
          (x) => `${x.artist.toLowerCase()}|${x.title.toLowerCase()}` === targetId,
        );
        if (!reverseBundle) continue;
        const inReverse = reverseBundle.byMethod[method].slice(0, topK).some(
          (x) => `${x.artist.toLowerCase()}|${x.title.toLowerCase()}` === sourceId,
        );
        if (!inReverse) continue;
        const existing = reciprocalMap.get(pairKey) ?? {
          a: sourceId,
          b: targetId,
          methods: new Set<ClusterMethodId>(),
          score: 0,
        };
        existing.methods.add(method);
        existing.score = Math.max(existing.score, n.score);
        reciprocalMap.set(pairKey, existing);
      }
    }
  }

  const strongestReciprocals = [...reciprocalMap.values()]
    .map((p) => {
      const [aArtist, ...aRest] = p.a.split("|");
      const [bArtist, ...bRest] = p.b.split("|");
      return {
        a: `${aArtist} — ${aRest.join("|")}`,
        b: `${bArtist} — ${bRest.join("|")}`,
        methods: [...p.methods].sort().join("+"),
        score: p.score,
      };
    })
    .sort((a, b) => b.methods.length - a.methods.length || b.score - a.score)
    .slice(0, 15);

  const methodOverlapAvg = {
    AB: bundles.reduce((s, b) => s + b.overlap.AB, 0) / bundles.length,
    AC: bundles.reduce((s, b) => s + b.overlap.AC, 0) / bundles.length,
    BC: bundles.reduce((s, b) => s + b.overlap.BC, 0) / bundles.length,
  };

  return {
    year,
    songCount: songs.length,
    uniqueSongCount: pool.length,
    songs: bundles,
    topNeighborhoods,
    mostConnected,
    mostIsolated,
    strongestReciprocals,
    methodOverlapAvg,
  };
}

/** Lookup neighbors for one song (for dev UI). */
export function neighborsForSong(
  songs: VdjPoolSong[],
  year: number,
  songKey: string,
  topK = DEFAULT_TOP_K,
): SongNeighborBundle | null {
  const report = buildYearNeighborhoods(songs, year, topK);
  const song = songs.find((s) => s.key === songKey);
  if (!song) return null;
  const id = `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
  return (
    report.songs.find(
      (b) => `${b.artist.toLowerCase()}|${b.title.toLowerCase()}` === id,
    ) ?? null
  );
}

export { DEFAULT_TOP_K };
