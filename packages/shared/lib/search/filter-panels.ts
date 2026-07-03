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
  const artists = panels.artistsCharts.filter((item) => item.kind === "artist").length;
  const charts = panels.artistsCharts.filter((item) => item.kind === "chart").length;
  const total = panels.albums.length + panels.songs.length + panels.artistsCharts.length;
  return {
    total,
    albums: panels.albums.length,
    songs: panels.songs.length,
    artists,
    charts,
    artistsCharts: panels.artistsCharts.length,
  };
}

export function formatResultsStats(
  counts: ReturnType<typeof panelCounts>,
  options?: { hasChartHistory?: boolean },
): string {
  const hasChartHistory = options?.hasChartHistory === true;
  if (counts.total === 0 && !hasChartHistory) return "Nothing in the stacks yet";
  const parts: string[] = [];
  if (counts.albums > 0) {
    parts.push(`${counts.albums} ALBUM${counts.albums === 1 ? "" : "S"}`);
  }
  if (counts.songs > 0) {
    parts.push(`${counts.songs} SONG${counts.songs === 1 ? "" : "S"}`);
  }
  if (counts.artists > 0) {
    parts.push(`${counts.artists} ARTIST${counts.artists === 1 ? "" : "S"}`);
  }
  if (counts.charts > 0) {
    parts.push(
      `${counts.charts} CHART APPEARANCE${counts.charts === 1 ? "" : "S"}`,
    );
  }
  if (hasChartHistory) {
    parts.push("CHARTS HISTORY");
  }
  return parts.length > 0 ? parts.join(" • ") : "Results in the stacks";
}
