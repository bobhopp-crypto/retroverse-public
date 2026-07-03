import type { SearchResult } from "./types";

/**
 * Client-side filter for mock data.
 *
 * Future DB wiring: swap this for an async `searchRetroverse(query)`
 * that hits your index/API and returns `SearchResult[]`.
 */
export function filterSearchResults(
  results: SearchResult[],
  query: string,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return results;

  return results.filter((item) => {
    const haystack = [
      item.title,
      item.artist,
      String(item.year),
      item.kind,
      item.chartNote ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
