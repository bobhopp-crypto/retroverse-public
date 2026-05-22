export type SearchResultKind = "artist" | "album" | "track";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  artist: string;
  year: number;
  chartNote?: string;
  hasVdj?: boolean;
};
