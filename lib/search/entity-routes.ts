import { slugFromArtistName } from "@/lib/artist/slug";

import type { SearchSuggestionKind } from "./search-suggestion-types";

const RE_RVAR = /^RVAR\d{6}$/i;
const RE_RVAL = /^RVAL\d{6}$/i;
const RE_RVTR = /^RVTR\d{6}$/i;
const RE_HOT100_TRACK = /^hot100-/i;

function slugFromEntityTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  if (!path) return null;

  const segment = entitySegmentFromHref(href);
  if (!segment) return null;

  if (kind === "artist") {
    if (path.startsWith("/artist/")) return path.toLowerCase();
    if (RE_RVAR.test(segment)) return null;
    return `/artist/${segment.toLowerCase()}`;
  }

  if (kind === "album") {
    if (RE_RVAL.test(segment)) return `/album/${segment.toUpperCase()}`;
    return `/album/${segment.toLowerCase()}`;
  }

  if (kind === "song") {
    if (RE_RVTR.test(segment)) return `/track/${segment.toUpperCase()}`;
    if (RE_HOT100_TRACK.test(segment)) return null;
    if (path.startsWith("/track/")) return path.toLowerCase();
    return `/track/${segment.toLowerCase()}`;
  }

  return null;
}

export function artistSuggestionHref(
  name: string,
  upstreamHref?: string | null,
): string {
  return (
    normalizeEntityRouteHref(upstreamHref, "artist") ??
    `/artist/${slugFromArtistName(name)}`
  );
}

export function albumSuggestionHref(
  title: string,
  upstreamHref?: string | null,
): string {
  const segment = entitySegmentFromHref(upstreamHref);
  if (segment && RE_RVAL.test(segment)) {
    return `/album/${segment.toUpperCase()}`;
  }
  return (
    normalizeEntityRouteHref(upstreamHref, "album") ??
    `/album/${slugFromEntityTitle(title)}`
  );
}

export function trackPageHref(rvtrOrSlug: string): string {
  const raw = rvtrOrSlug.trim();
  if (RE_RVTR.test(raw)) return `/track/${raw.toUpperCase()}`;
  return `/track/${slugFromEntityTitle(raw)}`;
}

export function trackSuggestionHref(
  title: string,
  upstreamHref?: string | null,
): string {
  const segment = entitySegmentFromHref(upstreamHref);
  if (segment && RE_RVTR.test(segment)) {
    return `/track/${segment.toUpperCase()}`;
  }
  const normalized = normalizeEntityRouteHref(upstreamHref, "song");
  if (normalized) return normalized;
  return trackPageHref(title);
}

export function yearSuggestionHref(year: number | string): string {
  return `/rv/${year}`;
}

/** True when href targets a public entity page (not /search). */
export function isDirectEntityHref(href: string): boolean {
  const path = pathnameFromHref(href);
  if (!path) return false;
  return (
    path.startsWith("/artist/") ||
    path.startsWith("/album/") ||
    path.startsWith("/track/") ||
    path.startsWith("/rv/")
  );
}
