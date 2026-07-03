/** Bundled playlist snapshots for production (no VirtualDJ filesystem). */

export type SundaySnapshotSong = {
  key: string;
  artist: string;
  title: string;
  year: number;
  rvtr: string | null;
  sourceList: string;
  path: string | null;
  remix?: string | null;
};

export type SundayPlaylistSnapshot = {
  version: 1;
  year: number;
  exportedAt: string;
  source: string;
  songs: SundaySnapshotSong[];
};
