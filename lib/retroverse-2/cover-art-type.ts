export type CoverArtType =
  | "album"
  | "single"
  | "compilation"
  | "greatest_hits"
  | "unknown";

const ART_TYPE_LABELS: Record<CoverArtType, string> = {
  album: "Album",
  single: "Single",
  compilation: "Compilation",
  greatest_hits: "Greatest Hits",
  unknown: "Unknown",
};

/** Lower rank = preferred artwork (exact album first). */
export const COVER_ART_TYPE_RANK: Record<CoverArtType, number> = {
  album: 0,
  single: 1,
  unknown: 2,
  compilation: 3,
  greatest_hits: 4,
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

export function classifyCoverArtType(albumTitle: string, trackTitle?: string): CoverArtType {
  const album = normalize(albumTitle);
  const track = trackTitle ? normalize(trackTitle) : "";

  if (!album) return "unknown";

  if (
    album.includes("greatest hits") ||
    album.includes("best of") ||
    album.includes("anthology") ||
    album.includes("gold") ||
    album.includes("legend") ||
    album.includes("definitive collection")
  ) {
    return "greatest_hits";
  }

  if (
    album.includes("compilation") ||
    album.includes("collection") ||
    album.includes("treasures") ||
    album.includes("sampler") ||
    album.includes("various artists")
  ) {
    return "compilation";
  }

  if (
    album.includes(" single") ||
    album.endsWith(" single") ||
    album.includes(" b w ") ||
    album.includes(" b side") ||
    album.includes(" 45 ")
  ) {
    return "single";
  }

  if (track && (album === track || album.includes(track) || track.includes(album))) {
    return "album";
  }

  return "album";
}

export function coverArtTypeLabel(type: CoverArtType): string {
  return ART_TYPE_LABELS[type];
}

export function coverArtTypePenalty(
  albumTitle: string,
  trackTitle: string,
  albumTitleMatch: boolean,
): number {
  const type = classifyCoverArtType(albumTitle, trackTitle);
  switch (type) {
    case "greatest_hits":
      return albumTitleMatch ? 18 : 38;
    case "compilation":
      return albumTitleMatch ? 12 : 30;
    case "single":
      return albumTitleMatch ? 0 : 12;
    case "unknown":
      return albumTitleMatch ? 4 : 14;
    default:
      return 0;
  }
}
