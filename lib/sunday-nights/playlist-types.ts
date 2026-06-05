/** Client-safe types for Sunday Nights playlist/event ops (no Node/fs imports). */

export const SUNDAY_EVENT_YEARS = [1967, 1978, 1992] as const;

export type SundayYearFilter = (typeof SUNDAY_EVENT_YEARS)[number] | "all";

export type SundayPlaylistSong = {
  key: string;
  year: number;
  artist: string;
  title: string;
  rvtr: string | null;
  path: string;
};

export type SundayPlaylistListMeta = {
  id: string;
  label: string;
  year: number | null;
};

export type SundayEventPayload = {
  yearFilter: SundayYearFilter;
  playlists: SundayPlaylistListMeta[];
  myListsPath: string;
  songs: SundayPlaylistSong[];
};

export type SundaySearchSource = "mylist" | "retroverse" | "vdj-xml" | "alias";

export type SundaySearchHit = {
  id: string;
  source: SundaySearchSource;
  artist: string;
  title: string;
  rvtr: string | null;
  year: number | null;
  path: string | null;
  songKey: string | null;
  detail: string | null;
};

export type SundayMatchCandidate = {
  rvtr: string;
  title: string;
  artistName: string;
  peakHot100: number | null;
};
