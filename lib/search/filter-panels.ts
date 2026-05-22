import type { SearchPanels } from "./types";

function matchesQuery(fields: (string | number | undefined)[], q: string): boolean {
  const haystack = fields
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Client-side panel filter for mock data.
 *
 * Future DB wiring: replace with server search returning SearchPanels.
 */
export function filterSearchPanels(panels: SearchPanels, query: string): SearchPanels {
  const q = query.trim().toLowerCase();
  if (!q) return panels;

  return {
    albums: panels.albums.filter((item) =>
      matchesQuery([item.title, item.artist, item.year, item.chartNote], q),
    ),
    songs: panels.songs.filter((item) =>
      matchesQuery([item.title, item.artist, item.year, item.chartNote], q),
    ),
    artistsCharts: panels.artistsCharts.filter((item) =>
      matchesQuery(
        [item.title, item.subtitle, item.year, item.chartNote, item.kind],
        q,
      ),
    ),
  };
}

export function panelCounts(panels: SearchPanels) {
  const total =
    panels.albums.length +
    panels.songs.length +
    panels.artistsCharts.length;
  return {
    total,
    albums: panels.albums.length,
    songs: panels.songs.length,
    artistsCharts: panels.artistsCharts.length,
  };
}
