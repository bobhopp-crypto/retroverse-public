import type { SearchSuggestionKind } from "./search-suggestion-types";

const RE_RVAL = /^RVAL\d{6}$/i;
const RE_RVTR = /^RVTR\d{6}$/i;
const RE_RVTR_LABEL = /^(?:DK_|PK_)?(RVTR\d{6})$/i;
const RE_HOT100_TRACK = /^hot100-/i;
const RE_ARTIST_ID = /^\d+$/;

export const SONG_EXPERIENCE_PREFIX = "/retroverse-2/song";

function pathnameFromHref(href: string): string | null {
  const raw = href.trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw.split("?")[0] ?? raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return null;
    }
  }
  return null;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

function isBlockedRoot(path: string | null): boolean {
  return !path || path === "/" || path === "/search";
}

function artistSegmentFromPath(path: string): string | null {
  if (!path.startsWith("/artist/")) return null;
  const seg = decodeSegment(path.slice("/artist/".length).split("/")[0] ?? "");
  return RE_ARTIST_ID.test(seg) ? seg : null;
}

function albumSegmentFromPath(path: string): string | null {
  if (!path.startsWith("/album/")) return null;
  const seg = decodeSegment(path.slice("/album/".length).split("/")[0] ?? "");
  return RE_RVAL.test(seg) ? seg.toUpperCase() : null;
}

function legacyTrackSegmentFromPath(path: string): string | null {
  if (!path.startsWith("/track/")) return null;
  const seg = decodeSegment(path.slice("/track/".length).split("/")[0] ?? "");
  return RE_RVTR.test(seg) ? seg.toUpperCase() : null;
}

function songSegmentFromPath(path: string): string | null {
  if (path.startsWith(`${SONG_EXPERIENCE_PREFIX}/`)) {
    const seg = decodeSegment(
      path.slice(`${SONG_EXPERIENCE_PREFIX}/`.length).split("/")[0] ?? "",
    );
    return RE_RVTR.test(seg) ? seg.toUpperCase() : null;
  }
  return legacyTrackSegmentFromPath(path);
}

function songExperienceHrefFromSegment(segment: string): string {
  if (RE_RVTR.test(segment)) {
    return `${SONG_EXPERIENCE_PREFIX}/${segment.toUpperCase()}`;
  }
  return `${SONG_EXPERIENCE_PREFIX}/unknown`;
}

function rvYearFromPath(path: string): string | null {
  if (!path.startsWith("/rv/")) return null;
  const year = path.slice("/rv/".length).split("/")[0] ?? "";
  return /^\d{4}$/.test(year) ? year : null;
}

/** Entity path segment from welcome-style `/artists|albums|tracks/...` hrefs. */
export function entitySegmentFromHref(href: string | null | undefined): string | null {
  const path = pathnameFromHref(href ?? "");
  if (!path) return null;
  const match = path.match(/\/(?:artists?|albums?|tracks?)\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

/** Map welcome/upstream entity paths to public discovery routes. */
export function normalizeEntityRouteHref(
  href: string | null | undefined,
  kind: SearchSuggestionKind,
): string | null {
  const path = pathnameFromHref(href ?? "");
  if (isBlockedRoot(path)) return null;

  const segment = entitySegmentFromHref(href);
  if (!segment) return null;

  if (kind === "artist") {
    if (path!.startsWith("/artist/")) {
      return artistSegmentFromPath(path!) ? path!.toLowerCase() : null;
    }
    return RE_ARTIST_ID.test(segment) ? `/artist/${segment}` : null;
  }

  if (kind === "album") {
    if (RE_RVAL.test(segment)) return `/album/${segment.toUpperCase()}`;
    return null;
  }

  if (kind === "song") {
    if (RE_RVTR.test(segment)) return songExperienceHrefFromSegment(segment.toUpperCase());
    if (RE_HOT100_TRACK.test(segment)) return null;
    if (path!.startsWith("/track/") || path!.startsWith(`${SONG_EXPERIENCE_PREFIX}/`)) {
      const coerced = songSegmentFromPath(path!);
      return coerced ? songExperienceHrefFromSegment(coerced) : null;
    }
    return null;
  }

  return null;
}

export function artistPublicHrefFromName(name: string): string | null {
  void name;
  return null;
}

export function artistPublicHrefFromId(artistId: string | number): string | null {
  const id = String(artistId).trim();
  return RE_ARTIST_ID.test(id) && Number(id) > 0 ? `/artist/${id}` : null;
}

/** Never returns `/`, `/search`, `/artist/`, or RVAR canonical paths. */
export function coerceArtistPublicHref(
  name: string,
  upstreamHref?: string | null,
): string | null {
  void name;
  const fallback = null;
  const raw = upstreamHref?.trim() ?? "";
  if (!raw) return fallback;

  const path = pathnameFromHref(raw);
  if (isBlockedRoot(path)) return fallback;

  if (path?.startsWith("/artist/")) {
    const coerced = artistSegmentFromPath(path);
    return coerced ? `/artist/${coerced}` : fallback;
  }

  const normalized = normalizeEntityRouteHref(raw, "artist");
  if (normalized) return normalized;

  return fallback;
}

export function coerceAlbumPublicHref(
  title: string,
  upstreamHref?: string | null,
): string | null {
  void title;
  const fallback = null;
  const raw = upstreamHref?.trim() ?? "";
  if (!raw) return fallback;

  const path = pathnameFromHref(raw);
  if (isBlockedRoot(path)) return fallback;

  if (path?.startsWith("/album/")) {
    const coerced = albumSegmentFromPath(path);
    return coerced ? `/album/${coerced}` : fallback;
  }

  const segment = entitySegmentFromHref(raw);
  if (segment && RE_RVAL.test(segment)) {
    return `/album/${segment.toUpperCase()}`;
  }

  const normalized = normalizeEntityRouteHref(raw, "album");
  if (normalized) return normalized;

  return fallback;
}

export function coerceTrackPublicHref(
  title: string,
  upstreamHref?: string | null,
  rvId?: string | null,
): string | null {
  void title;
  const id = rvId?.trim() ?? "";
  const fallback = RE_RVTR.test(id) ? trackPageHref(id) : null;
  if (!fallback) return null;

  const raw = upstreamHref?.trim() ?? "";
  if (!raw) return fallback;

  const path = pathnameFromHref(raw);
  if (isBlockedRoot(path)) return fallback;

  if (path?.startsWith("/track/") || path?.startsWith(`${SONG_EXPERIENCE_PREFIX}/`)) {
    const coerced = songSegmentFromPath(path);
    return coerced ? songExperienceHrefFromSegment(coerced) : fallback;
  }

  const segment = entitySegmentFromHref(raw);
  if (segment && RE_RVTR.test(segment)) {
    return songExperienceHrefFromSegment(segment.toUpperCase());
  }

  const normalized = normalizeEntityRouteHref(raw, "song");
  if (normalized) return normalized;

  return fallback;
}

export function artistSuggestionHref(
  name: string,
  upstreamHref?: string | null,
): string | null {
  return coerceArtistPublicHref(name, upstreamHref);
}

export function albumSuggestionHref(
  title: string,
  upstreamHref?: string | null,
): string | null {
  return coerceAlbumPublicHref(title, upstreamHref);
}

/** Canonical public song destination — Song Experience route. */
export function trackPageHref(rvtrOrSlug: string): string {
  const raw = rvtrOrSlug.trim();
  if (!raw) return "/search";
  const rvtr = raw.match(RE_RVTR_LABEL)?.[1];
  if (rvtr) return `${SONG_EXPERIENCE_PREFIX}/${rvtr.toUpperCase()}`;
  return "/search";
}

export function trackSuggestionHref(
  title: string,
  upstreamHref?: string | null,
): string | null {
  return coerceTrackPublicHref(title, upstreamHref, null);
}

export function yearSuggestionHref(year: number | string): string {
  const y = String(year).trim();
  return /^\d{4}$/.test(y) ? `/rv/${y}` : `/rv/${new Date().getFullYear()}`;
}

/** True when href targets a valid public entity page (not /, /search, or empty slug). */
export function isDirectEntityHref(href: string): boolean {
  const path = pathnameFromHref(href);
  if (isBlockedRoot(path)) return false;

  if (path!.startsWith("/artist/")) return artistSegmentFromPath(path!) != null;
  if (path!.startsWith("/album/")) return albumSegmentFromPath(path!) != null;
  if (path!.startsWith("/track/") || path!.startsWith(`${SONG_EXPERIENCE_PREFIX}/`)) {
    return songSegmentFromPath(path!) != null;
  }
  if (path!.startsWith("/rv/")) return rvYearFromPath(path!) != null;

  return false;
}

/** Final guard before router.push / <Link href> from search UI. */
export function sanitizePublicNavigationHref(href: string): string | null {
  const raw = href.trim();
  if (!raw) return null;

  if (isDirectEntityHref(raw)) {
    return pathnameFromHref(raw) ?? raw.split("?")[0] ?? null;
  }

  const path = pathnameFromHref(raw);
  if (isBlockedRoot(path)) return null;

  return null;
}
