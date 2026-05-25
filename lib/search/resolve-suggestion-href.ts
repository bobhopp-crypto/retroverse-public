import {
  albumSuggestionHref,
  artistSuggestionHref,
  isDirectEntityHref,
  normalizeEntityRouteHref,
  trackSuggestionHref,
  yearSuggestionHref,
} from "@/lib/search/entity-routes";
import type { SearchSuggestionItem } from "@/lib/search/search-suggestion-types";

/** Resolve a tap/Enter target — never returns `/search`. */
export function resolveSuggestionHref(item: SearchSuggestionItem): string | null {
  const raw = item.href?.trim() ?? "";
  if (raw && isDirectEntityHref(raw)) return raw.split("?")[0] ?? raw;

  const normalized = normalizeEntityRouteHref(raw, item.kind);
  if (normalized) return normalized;

  if (item.kind === "artist") {
    return artistSuggestionHref(item.title, raw || null);
  }
  if (item.kind === "album") {
    return albumSuggestionHref(item.title, raw || null);
  }
  if (item.kind === "song") {
    return trackSuggestionHref(item.title, raw || null);
  }
  if (item.kind === "year" && item.year != null) {
    return yearSuggestionHref(item.year);
  }

  if (raw.startsWith("/artist/")) return raw;
  if (raw.startsWith("/album/")) return raw;
  if (raw.startsWith("/track/")) return raw;
  if (raw.startsWith("/rv/")) return raw;

  return null;
}
