export type CrossroadsSongRow = {
  artist: string;
  title: string;
};

export type CrossroadsArtist = {
  artistNorm: string;
  artist: string;
  yearsPresent: number[];
  yearCounts: Record<number, number>;
  songsByYear: Record<number, string[]>;
  spanCount: number;
  totalSongs: number;
  inAllYears: boolean;
};

export type CrossroadsPayload = {
  ok: true;
  years: [number, number, number];
  distinctYears: number[];
  artists: CrossroadsArtist[];
  artistCount: number;
};
