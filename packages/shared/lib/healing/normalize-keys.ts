import { normalizeTrackTitleKey } from "@/lib/track/album-link-recovery/normalize-title";

/** Normalized artist key for duplicate clustering (deterministic). */
export function normalizeArtistKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function healingClusterKey(title: string, artist: string): string {
  return `${normalizeTrackTitleKey(title)}::${normalizeArtistKey(artist)}`;
}
