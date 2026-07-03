import "server-only";

import { entitiesToSuggestionGroups } from "@/lib/search/entities-to-suggestions";
import {
  querySearchEntities,
} from "@/lib/search/query-search-entities";
import { searchBreadthTier } from "@/lib/search/search-breadth";
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
  /** PG index path — for production verification via curl. */
  index?: {
    entitySource: "matview" | "inline";
    pgTrgm: boolean;
  };
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

  try {
    const { entities, meta } = await querySearchEntities(q, { mode: "overlay" });
    const suggestions = entitiesToSuggestionGroups(entities);
    const total = suggestionTotal(suggestions);
    const canonicalArtist = suggestions.artists[0]?.title ?? null;

    console.log("[search-suggestions]", {
      q,
      source: "entities",
      breadth: searchBreadthTier(q),
      canonicalArtist,
      total,
      artists: suggestions.artists.length,
      songs: suggestions.songs.length,
      albums: suggestions.albums.length,
      years: suggestions.years.length,
      entitySource: meta.entitySource,
      pgTrgm: meta.pgTrgm,
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
        index: meta,
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
      index: meta,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[search-suggestions]", { q, message });
    return {
      ok: false,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      canonicalArtist: null,
      rvYearIntent: false,
      error: message,
      source: "none",
    };
  }
}
