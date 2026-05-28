/** Ops-only Discogs search URL builder (no API calls). */

export function buildDiscogsSearchUrl(
  artist: string,
  album: string,
  releaseYear: number | null,
): string {
  const parts = [artist.trim(), album.trim()];
  if (releaseYear != null) parts.push(String(releaseYear));
  const q = encodeURIComponent(parts.join(" "));
  return `https://www.discogs.com/search/?q=${q}&type=release`;
}

export function isAllowedDiscogsEmbedUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    if (!u.hostname.endsWith("discogs.com")) return false;
    return u.pathname.startsWith("/search") || u.pathname.startsWith("/release/");
  } catch {
    return false;
  }
}
