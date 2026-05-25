import "server-only";

import { welcomeUpstreamBase } from "@/lib/control-center/welcome-base";
import { buildSearchNormalization } from "@/lib/search/build-search-normalization";
import {
  buildHomeSearchSuggestions,
  suggestionGroupCount,
} from "@/lib/search/build-home-suggestions";
import { normalizeHomeSearchPayload } from "@/lib/search/map-home-search";
import { buildRvYearIntentSuggestions } from "@/lib/rv-year/rv-year-intent";
import {
  loadPgPrefixSearchPayload,
  mergeHomeSearchPayloads,
} from "@/lib/search/pg-prefix-search";
import { upstreamQueryForSuggestions } from "@/lib/search/suggestion-scoring";
import { EMPTY_SUGGESTION_GROUPS } from "@/lib/search/search-suggestion-types";
import type { SearchSuggestionGroups } from "@/lib/search/search-suggestion-types";

export type SuggestionResponse = {
  ok: boolean;
  q: string;
  suggestions: SearchSuggestionGroups;
  total: number;
  canonicalArtist: string | null;
  rvYearIntent: boolean;
  error?: string;
  /** `welcome` | `pg` | `merged` | `none` */
  source?: string;
};

export async function loadSuggestionResponse(q: string): Promise<SuggestionResponse> {
  if (q.length < 2) {
    return {
      ok: true,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      canonicalArtist: null,
      rvYearIntent: false,
      source: "none",
    };
  }

  const yearIntent = buildRvYearIntentSuggestions(q);
  if (yearIntent) {
    return {
      ok: true,
      q,
      suggestions: yearIntent,
      total: 1,
      canonicalArtist: null,
      rvYearIntent: true,
      source: "year",
    };
  }

  const preNorm = await buildSearchNormalization(q);
  const canonicalArtist = preNorm.resolved?.canonicalName ?? null;
  const upstreamQ = upstreamQueryForSuggestions(q, canonicalArtist);
  const upstreamBase = welcomeUpstreamBase().replace(/\/$/, "");

  let payload = normalizeHomeSearchPayload(null, q);
  let upstreamError: string | undefined;
  let gotWelcome = false;

  if (upstreamBase) {
    const upstream = `${upstreamBase}/api/home-search?q=${encodeURIComponent(upstreamQ)}&limit=48`;
    try {
      const res = await fetch(upstream, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const raw = await res.json();
        payload = normalizeHomeSearchPayload(raw, q);
        gotWelcome =
          payload.artists.length > 0 ||
          payload.tracks.length > 0 ||
          payload.albums.length > 0;
      } else {
        upstreamError = `Upstream returned ${res.status}`;
        console.warn("[search-suggestions]", { q, upstreamError });
      }
    } catch (e) {
      upstreamError = e instanceof Error ? e.message : String(e);
      console.warn("[search-suggestions]", { q, upstreamError });
    }
  } else {
    upstreamError = "SEARCH_UPSTREAM_BASE_URL not configured";
  }

  const pgPayload = await loadPgPrefixSearchPayload(q);
  let source = "none";

  if (pgPayload && gotWelcome) {
    payload = mergeHomeSearchPayloads(payload, pgPayload);
    source = "merged";
  } else if (pgPayload) {
    payload = pgPayload;
    source = "pg";
  } else if (gotWelcome) {
    source = "welcome";
  }

  const suggestions = buildHomeSearchSuggestions(payload, q, canonicalArtist);
  const total = suggestionGroupCount(suggestions);

  if (total === 0 && upstreamError && !pgPayload) {
    return {
      ok: false,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      canonicalArtist,
      rvYearIntent: false,
      error: upstreamError,
      source: "none",
    };
  }

  console.log("[search-suggestions]", {
    q,
    upstreamQ,
    canonicalArtist,
    source,
    total,
    upstreamError: upstreamError ?? null,
    artists: suggestions.artists.length,
    songs: suggestions.songs.length,
    albums: suggestions.albums.length,
    years: suggestions.years.length,
  });

  return {
    ok: true,
    q,
    suggestions,
    total,
    canonicalArtist,
    rvYearIntent: false,
    error: total === 0 ? upstreamError : undefined,
    source,
  };
}
