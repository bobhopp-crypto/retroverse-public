import "server-only";

import { buildSearchNormalization } from "@/lib/search/build-search-normalization";
import { entitiesToSuggestionGroups } from "@/lib/search/entities-to-suggestions";
import { querySearchEntities } from "@/lib/search/query-search-entities";
import { buildRvYearIntentSuggestions } from "@/lib/rv-year/rv-year-intent";
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
  /** `entities` | `year` | `none` */
  source?: string;
};

function suggestionTotal(groups: SearchSuggestionGroups): number {
  return (
    groups.artists.length +
    groups.songs.length +
    groups.albums.length +
    groups.years.length
  );
}

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

  try {
    const entities = await querySearchEntities(q);
    const suggestions = entitiesToSuggestionGroups(entities);
    const total = suggestionTotal(suggestions);

    console.log("[search-suggestions]", {
      q,
      source: "entities",
      canonicalArtist,
      total,
      artists: suggestions.artists.length,
      songs: suggestions.songs.length,
      albums: suggestions.albums.length,
      years: suggestions.years.length,
    });

    if (total === 0) {
      return {
        ok: true,
        q,
        suggestions,
        total: 0,
        canonicalArtist,
        rvYearIntent: false,
        source: "entities",
      };
    }

    return {
      ok: true,
      q,
      suggestions,
      total,
      canonicalArtist,
      rvYearIntent: false,
      source: "entities",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[search-suggestions]", { q, message });
    return {
      ok: false,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      canonicalArtist,
      rvYearIntent: false,
      error: message,
      source: "none",
    };
  }
}
