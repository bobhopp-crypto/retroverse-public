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

function normalizeDiscoveryTerm(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function quoteDiscoveryTerm(value: string | null | undefined): string | null {
  const normalized = normalizeDiscoveryTerm(value);
  if (!normalized) return null;
  return `"${normalized}"`;
}

/** Quoted, entity-aware Wikipedia search text — not used for other providers. */
export function wikipediaDiscoveryQuery(input: ExternalDiscoveryQuery): string {
  const title = normalizeDiscoveryTerm(input.title);
  const artist = normalizeDiscoveryTerm(input.artist);
  const album = normalizeDiscoveryTerm(input.album);
  const year =
    input.year != null && String(input.year).trim()
      ? normalizeDiscoveryTerm(String(input.year))
      : "";

  switch (input.entityType) {
    case "song": {
      const parts = [quoteDiscoveryTerm(title), quoteDiscoveryTerm(artist)].filter(Boolean) as string[];
      return parts.join(" ");
    }
    case "artist": {
      return quoteDiscoveryTerm(artist || title) ?? "";
    }
    case "album": {
      const albumTerm = quoteDiscoveryTerm(album || title);
      const artistTerm = quoteDiscoveryTerm(artist);
      const parts = [albumTerm, artistTerm].filter(Boolean) as string[];
      return parts.join(" ");
    }
    case "year":
      return cleanParts([year, "music"]);
    default:
      return "";
  }
}

export function discoveryQueryForProvider(
  kind: ExternalSearchKind,
  input: ExternalDiscoveryQuery,
): string {
  if (kind === "wikipedia") return wikipediaDiscoveryQuery(input);
  return externalDiscoveryQuery(input);
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
