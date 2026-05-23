/** Shape returned by retroverse-welcome GET /api/home-search */

export type HomeSearchRelation = "TRACK" | "ALBUM" | "HOT100" | "VDJ";

export type HomeSearchTrack = {
  kind: "track";
  title: string;
  artist: string;
  href: string;
  subtitle: string | null;
  linkedAlbum?: string | null;
  linkedAlbumHref?: string | null;
  hasVideo?: boolean;
  coverUrl?: string | null;
  relation?: HomeSearchRelation;
  /** Chart or album year when known (e.g. Hot 100 first chart year). */
  year?: number | null;
};

export type HomeSearchAlbum = {
  kind: "album";
  title: string;
  artist: string;
  year: number | null;
  href: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  relation?: HomeSearchRelation;
};

export type HomeSearchArtist = {
  kind: "artist";
  name: string;
  href: string;
  coverUrl?: string | null;
};

export type HomeSearchChart = {
  kind: "chart";
  label: string;
  year: number;
  weekDate: string;
  href: string;
  relation?: HomeSearchRelation;
};

export type HomeSearchPayload = {
  ok: true;
  q: string;
  tracks: HomeSearchTrack[];
  albums: HomeSearchAlbum[];
  artists: HomeSearchArtist[];
  charts: HomeSearchChart[];
  incomplete?: boolean;
};
