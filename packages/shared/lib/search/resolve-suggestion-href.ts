import {
  albumSuggestionHref,
  artistSuggestionHref,
  coerceArtistPublicHref,
  coerceAlbumPublicHref,
  coerceTrackPublicHref,
  isDirectEntityHref,
  sanitizePublicNavigationHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import { warnSearchRouteIssue } from "@/lib/search/log-search-route";
import type { SearchSuggestionItem } from "@/lib/search/search-suggestion-types";

/** Resolve a tap/Enter target — never returns `/`, `/search`, or malformed entity paths. */
export function resolveSuggestionHref(item: SearchSuggestionItem): string | null {
  const raw = item.href?.trim() ?? "";

  if (raw && isDirectEntityHref(raw)) {
    const direct = sanitizePublicNavigationHref(raw);
    if (direct) return direct;
    warnSearchRouteIssue("reject-direct", {
      kind: item.kind,
      title: item.title,
      href: raw,
    });
  }

  let resolved: string | null = null;

  if (item.kind === "artist") {
    resolved = artistSuggestionHref(item.title, raw || null);
  } else if (item.kind === "album") {
    resolved = albumSuggestionHref(item.title, raw || null);
  } else if (item.kind === "song") {
    resolved = coerceTrackPublicHref(item.title, raw || null, item.rvId ?? null);
  } else if (item.kind === "year" && item.year != null) {
    resolved = yearSuggestionHref(item.year);
  }

  const safe = resolved ? sanitizePublicNavigationHref(resolved) : null;

  if (!safe) {
    warnSearchRouteIssue("unresolved", {
      kind: item.kind,
      title: item.title,
      href: raw || null,
      rvId: item.rvId ?? null,
    });
  }

  return safe;
}
