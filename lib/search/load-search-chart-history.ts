import { inspectPing } from "@/lib/inspect/pg";
import { artistPagePath, resolveArtistForSearchQuery } from "@/lib/artist/resolve-artist";
import {
  loadArtistChartHistory,
  loadRvYearChartHistory,
} from "@/lib/artist/load-chart-history";
import type { ArtistChartHistory } from "@/lib/artist/chart-history-types";
import type { SearchPanels } from "@/lib/search/types";
import {
  detectYearContext,
  normalizeRVYear,
  stripYearTokensFromQuery,
} from "@/lib/search/normalize-rv-year";

export type SearchChartHistoryContext = {
  artistName: string;
  artistSlug: string;
  viewAllHref: string;
  highlightTrackIds: string[];
  history: ArtistChartHistory;
  rvYear: number | null;
};

function artistHintsFromPanels(panels: SearchPanels): string[] {
  const hints = new Set<string>();
  for (const item of panels.artistsCharts) {
    if (item.kind === "artist" && item.title?.trim()) hints.add(item.title.trim());
  }
  for (const song of panels.songs) {
    if (song.artist?.trim()) hints.add(song.artist.trim());
  }
  return [...hints];
}

export async function loadSearchChartHistory(
  query: string,
  panels: SearchPanels,
): Promise<SearchChartHistoryContext | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  const yearContext = detectYearContext(q);
  const rvYear = normalizeRVYear(yearContext.rvYear);
  if (rvYear == null) return null;

  const ping = await inspectPing();
  if (!ping.ok) {
    console.warn("[search:rv-history]", "postgres unavailable", ping.error);
    return null;
  }

  const artistQuery = stripYearTokensFromQuery(q);
  const hints = artistHintsFromPanels(panels);
  let resolved = null;
  if (artistQuery.length >= 2) {
    resolved = await resolveArtistForSearchQuery(artistQuery, hints);
  } else if (hints.length > 0) {
    resolved = await resolveArtistForSearchQuery(hints[0]!, hints);
  }

  const coverByTrackId = new Map<string, string>();
  for (const song of panels.songs) {
    if (song.coverUrl) coverByTrackId.set(song.id.trim().toUpperCase(), song.coverUrl);
  }
  const fallbackCover = panels.songs.find((s) => s.coverUrl)?.coverUrl ?? null;

  let history: ArtistChartHistory | null = null;
  let artistName = artistQuery || q;

  if (resolved) {
    artistName = resolved.displayName;
    history = await loadArtistChartHistory(
      resolved.artistId,
      resolved.displayName,
      coverByTrackId,
      fallbackCover,
      rvYear,
    );
  } else {
    history = await loadRvYearChartHistory(rvYear, coverByTrackId, fallbackCover);
    artistName = `RV ${rvYear}`;
  }

  if (!history || !Array.isArray(history.activeYears) || history.activeYears.length === 0) {
    console.warn("[search:rv-history]", "no chart rows", {
      artist: artistName,
      rvYear,
      entries: history?.entries?.length ?? 0,
    });
    return null;
  }

  const highlightTrackIds = panels.songs.map((s) => s.id).filter(Boolean);

  return {
    artistName,
    artistSlug: resolved?.slug ?? "",
    viewAllHref: resolved
      ? `${artistPagePath(resolved.displayName) ?? `/artist/${resolved.slug}`}/charts`
      : "/charts",
    highlightTrackIds,
    history,
    rvYear,
  };
}
