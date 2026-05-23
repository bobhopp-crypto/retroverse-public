import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionGroups,
} from "./search-suggestion-types";

export type SuggestionsApiResponse = {
  ok: boolean;
  q: string;
  suggestions: SearchSuggestionGroups;
  total: number;
  canonicalArtist?: string | null;
  error?: string;
};

export async function fetchSearchSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<SuggestionsApiResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return {
      ok: true,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      canonicalArtist: null,
    };
  }

  const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, {
    signal,
  });

  if (!res.ok) {
    return {
      ok: false,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      error: `Suggestions failed (${res.status})`,
    };
  }

  const body = (await res.json()) as SuggestionsApiResponse;
  return {
    ok: body.ok !== false,
    q: typeof body.q === "string" ? body.q : q,
    suggestions: body.suggestions ?? EMPTY_SUGGESTION_GROUPS,
    total: typeof body.total === "number" ? body.total : 0,
    canonicalArtist: body.canonicalArtist ?? null,
    error: body.error,
  };
}
