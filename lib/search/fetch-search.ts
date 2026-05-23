import type { SearchChartHistoryContext } from "@/lib/search/load-search-chart-history";
import type { SearchPanels } from "./types";
import { EMPTY_SEARCH_PANELS } from "./empty-panels";

/** Expected when debounced search superseded or effect cleans up. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (/aborted/i.test(error.message)) return true;
  }
  return false;
}

export type SearchApiResponse = {
  ok: boolean;
  q: string;
  /** Header label when canonical artist resolved (e.g. THE BEATLES). */
  queryDisplay?: string | null;
  canonicalArtist?: string | null;
  panels: SearchPanels;
  chartHistory?: SearchChartHistoryContext | null;
  incomplete?: boolean;
  error?: string;
  /** Set when the request was cancelled — not an error. */
  aborted?: boolean;
};

export async function fetchSearchPanels(
  query: string,
  signal?: AbortSignal,
): Promise<SearchApiResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return { ok: true, q, panels: EMPTY_SEARCH_PANELS };
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) {
      return {
        ok: false,
        q,
        panels: EMPTY_SEARCH_PANELS,
        error: `Search failed (${res.status})`,
      };
    }

    const body = (await res.json()) as SearchApiResponse;
    return {
      ok: body.ok !== false,
      q: typeof body.q === "string" ? body.q : q,
      queryDisplay:
        typeof body.queryDisplay === "string" ? body.queryDisplay : null,
      canonicalArtist:
        typeof body.canonicalArtist === "string" ? body.canonicalArtist : null,
      panels: body.panels ?? EMPTY_SEARCH_PANELS,
      chartHistory: body.chartHistory ?? null,
      incomplete: body.incomplete,
      error: body.error,
    };
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return { ok: true, q, panels: EMPTY_SEARCH_PANELS, aborted: true };
    }
    throw error;
  }
}
