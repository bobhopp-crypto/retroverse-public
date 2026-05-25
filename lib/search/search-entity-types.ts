export type SearchEntityType = "artist" | "album" | "track" | "year";

export type SearchEntity = {
  entityType: SearchEntityType;
  label: string;
  normalizedLabel: string;
  rvId: string | null;
  slug: string;
  href: string;
  artist: string | null;
  year: number | null;
  coverUrl: string | null;
  rank: number;
};
