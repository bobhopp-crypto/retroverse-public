export type ExternalSearchKind = "youtube" | "wikipedia" | "spotify" | "apple_music";

export type ExternalDiscoveryEntityType = "song" | "artist" | "album" | "year";

export type ExternalDiscoveryQuery = {
  entityType: ExternalDiscoveryEntityType;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  year?: number | string | null;
};

function cleanParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

export function publicSearchQuery(...parts: Array<string | null | undefined>): string {
  return cleanParts(parts);
}

export function externalDiscoveryQuery(input: ExternalDiscoveryQuery): string {
  const year =
    input.year != null && String(input.year).trim()
      ? String(input.year).trim()
      : null;

  switch (input.entityType) {
    case "song":
      return publicSearchQuery(input.artist, input.title);
    case "album":
      return publicSearchQuery(input.artist, input.album ?? input.title);
    case "artist":
      return publicSearchQuery(input.artist ?? input.title);
    case "year":
      return publicSearchQuery(year, "music");
    default:
      return publicSearchQuery(input.title, input.artist, input.album, year);
  }
}

export function externalSearchHref(kind: ExternalSearchKind, query: string): string | null {
  const clean = cleanParts([query]);
  if (!clean) return null;
  const encoded = encodeURIComponent(clean);

  switch (kind) {
    case "youtube":
      return `https://www.youtube.com/results?search_query=${encoded}`;
    case "wikipedia":
      return `https://en.wikipedia.org/w/index.php?search=${encoded}`;
    case "spotify":
      return `https://open.spotify.com/search/${encoded}`;
    case "apple_music":
      return `https://music.apple.com/us/search?term=${encoded}`;
    default:
      return null;
  }
}

/** @deprecated Use externalSearchHref with ExternalDiscoveryQuery via ExternalDiscoveryLinks */
export type LegacyExternalSearchKind = "youtube" | "wikipedia";
