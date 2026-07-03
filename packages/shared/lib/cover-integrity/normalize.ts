import { normalizeArtistKey } from "@/lib/healing/normalize-keys";
import { normalizeTrackTitleKey } from "@/lib/track/album-link-recovery/normalize-title";
import { slugFromNormalizedLabel } from "@/lib/search/normalize-search-label";

export { normalizeTrackTitleKey, normalizeArtistKey };

export function slugToTitleKey(slug: string | null | undefined): string {
  if (!slug?.trim()) return "";
  return normalizeTrackTitleKey(slug.replace(/-/g, " "));
}

export function albumTitleKey(title: string): string {
  return normalizeTrackTitleKey(title);
}

export function artistSlugFromName(artist: string): string {
  return slugFromNormalizedLabel(artist);
}

const REMASTER_NOISE =
  /\b(deluxe|remaster|remastered|expanded|anniversary|bonus|limited edition|special edition|live|greatest hits|best of|the very best|collection)\b/gi;

export function stripEditionNoise(title: string): string {
  return title.replace(REMASTER_NOISE, " ").replace(/\s+/g, " ").trim();
}

export function titlesPartiallyMatch(a: string, b: string): boolean {
  const ka = albumTitleKey(a);
  const kb = albumTitleKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const coreA = albumTitleKey(stripEditionNoise(a));
  const coreB = albumTitleKey(stripEditionNoise(b));
  if (coreA && coreB && coreA === coreB) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  return false;
}

export function parseCoverFilename(filename: string): {
  rval: string | null;
  artistSlug: string | null;
  albumSlug: string | null;
} {
  const base = filename.replace(/\.[^.]+$/i, "").trim();
  const parts = base.split("__").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) {
    return { rval: null, artistSlug: null, albumSlug: null };
  }
  const rval = /^RVAL\d{6}$/i.test(parts[0]!) ? parts[0]!.toUpperCase() : null;
  return {
    rval,
    artistSlug: parts[1] ?? null,
    albumSlug: parts.slice(2).join("__"),
  };
}

export function basenameFromCoverPath(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const norm = path.trim().replace(/\\/g, "/");
  const seg = norm.split("/").filter(Boolean).pop();
  return seg ?? null;
}

export function rvalFromCoverPath(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const m = path.match(/RVAL\d{6}/i);
  return m ? m[0].toUpperCase() : null;
}

export function detectNormalizationDrift(
  albumTitle: string,
  filenameAlbumSlug: string | null,
): boolean {
  if (!filenameAlbumSlug) return false;
  const albumKey = albumTitleKey(albumTitle);
  const fileKey = slugToTitleKey(filenameAlbumSlug);
  if (!albumKey || !fileKey) return true;
  if (albumKey === fileKey) return false;
  if (titlesPartiallyMatch(albumTitle, filenameAlbumSlug.replace(/-/g, " "))) return false;
  const coreAlbum = albumTitleKey(stripEditionNoise(albumTitle));
  if (coreAlbum === fileKey) return false;
  return true;
}
