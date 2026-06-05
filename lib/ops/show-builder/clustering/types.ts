import type { VdjPoolSong } from "../types";

export type ClusterMethodId = "A" | "B" | "C";

export type ClusterRunOptions = {
  /** Method-specific pass label, e.g. "k7-merge3" */
  passId: string;
  k?: number;
  mergeMinSize?: number;
  mergeMinClusters?: number;
  outlierThreshold?: number;
  minClusterSize?: number;
  seedCount?: number;
};

export type ClusterMemberSong = {
  key: string;
  artist: string;
  title: string;
};

export type ClusterGroup = {
  id: string;
  label: string;
  color: string;
  bg: string;
  name: string;
  count: number;
  /** Method C: farthest-first seed for this cluster */
  seedSong?: ClusterMemberSong;
  /** Method B: songs removed from this cluster during outlier passes */
  outliers?: ClusterMemberSong[];
  members: ClusterMemberSong[];
};

export type ClusterRunResult = {
  method: ClusterMethodId;
  year: number;
  passId: string;
  options: ClusterRunOptions;
  songCount: number;
  uniqueSongCount: number;
  clusters: ClusterGroup[];
  /** Flat debug rows */
  debugRows: Array<{
    cluster: string;
    artist: string;
    title: string;
    method: ClusterMethodId;
    notes: string;
  }>;
  scores: ClusterScores;
};

export type ClusterScores = {
  cohesion: number;
  separation: number;
  silhouette: number;
  balance: number;
  anchorHits: number;
  anchorTotal: number;
  composite: number;
};

export type AnchorPair = {
  label: string;
  a: string;
  b: string;
};

export type YearAnchors = {
  year: number;
  pairs: AnchorPair[];
};

/** Dedupe pool by artist+title for clustering; keeps first key. */
export function dedupePool(songs: VdjPoolSong[]): VdjPoolSong[] {
  const seen = new Map<string, VdjPoolSong>();
  for (const song of songs) {
    const id = `${song.artist.toLowerCase()}|${song.title.toLowerCase()}`;
    if (!seen.has(id)) seen.set(id, song);
  }
  return [...seen.values()];
}

export function toMember(song: VdjPoolSong): ClusterMemberSong {
  return { key: song.key, artist: song.artist, title: song.title };
}
