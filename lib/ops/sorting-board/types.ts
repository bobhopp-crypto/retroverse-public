export type SortingBucket = {
  id: string;
  name: string;
};

export type SortingBoardFile = {
  version: 1;
  year: number;
  buckets: SortingBucket[];
  /** workspaceKey → bucket id; absent = unsorted */
  assignments: Record<string, string>;
  updatedAt: string;
};

export type SortingSong = {
  workspaceKey: string;
  artist: string;
  title: string;
  /** VDJ PlayCount rotation signal; 0 when unknown. */
  playCount: number;
  /** Local VIDEO path for frame preview API; null → placeholder. */
  previewPath: string | null;
};

export type SortingBoardPayload = {
  ok: true;
  year: number;
  buckets: Array<SortingBucket & { count: number }>;
  songs: SortingSong[];
  assignments: Record<string, string>;
};
