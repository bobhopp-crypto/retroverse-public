"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { coverInitialsFromTitle, DiscoverCard } from "./components/discover-card";
import { ResultsPanel } from "./components/results-panel";
import { SearchChartsHistoryPanel } from "./components/search-charts-history-panel";
import { SearchRvHistoryEntryPanel } from "./components/search-rv-history-entry-panel";
import { SearchSongsJukeboxPanel } from "./components/search-songs-jukebox-panel";
import { SearchHeader } from "./components/search-header";
import { EMPTY_SEARCH_PANELS } from "@/lib/search/empty-panels";
import { formatResultsStats, panelCounts } from "@/lib/search/filter-panels";
import { searchCountParts } from "@/lib/search/format-counts";
import { detectYearContext, normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { fetchSearchPanels, isAbortError } from "@/lib/search/fetch-search";
import { useSearchQuery } from "@/lib/search/use-search-query";
import {
  isUsableChartHistory,
  normalizeArtistChartHistory,
} from "@/lib/artist/chart-history";
import type { SearchChartHistoryContext } from "@/lib/search/load-search-chart-history";
import {
  searchAlbumsViewAllHref,
  searchSongsViewAllHref,
} from "@/lib/search/search-view-all-hrefs";
import type { SearchPanels } from "@/lib/search/types";

function panelSubtitle(
  tone: "albums" | "songs" | "artists",
  subject: string,
  trimmedQuery: string,
): string {
  if (!trimmedQuery) {
    return tone === "albums"
      ? "Explore albums"
      : tone === "songs"
        ? "Browse songs"
        : "Artists and chart appearances";
  }
  const who = subject;
  if (tone === "albums") return `Explore ${who}'s albums`;
  if (tone === "songs") return `Browse ${who}'s songs`;
  return `Related artists and chart appearances for ${who}`;
}

function coerceChartContext(
  raw: SearchChartHistoryContext | null | undefined,
  query: string,
): SearchChartHistoryContext | null {
  if (!raw || !raw.history) return null;
  const normalized = normalizeArtistChartHistory(
    raw.history,
    typeof raw.artistName === "string" ? raw.artistName : query,
  );
  if (!normalized || !isUsableChartHistory(normalized)) return null;
  const rvYear =
    normalizeRVYear(
      (raw as SearchChartHistoryContext).rvYear ?? detectYearContext(query).rvYear,
    ) ?? null;

  return {
    artistName: raw.artistName ?? query,
    artistSlug: raw.artistSlug ?? "",
    viewAllHref: raw.viewAllHref ?? "#",
    highlightTrackIds: Array.isArray(raw.highlightTrackIds) ? raw.highlightTrackIds : [],
    history: normalized,
    rvYear,
  };
}

function searchHasResults(
  panels: SearchPanels,
  chart: SearchChartHistoryContext | null,
  options: { showRvHistoryFull: boolean; showRvHistoryEntry: boolean },
): boolean {
  const hasChart =
    options.showRvHistoryFull &&
    chart != null &&
    isUsableChartHistory(chart.history);
  return (
    panels.albums.length > 0 ||
    panels.songs.length > 0 ||
    panels.artistsCharts.length > 0 ||
    hasChart ||
    options.showRvHistoryEntry
  );
}

export default function SearchClient() {
  const { query, setQuery, commitQuery, trimmedQuery } = useSearchQuery();
  const [panels, setPanels] = useState<SearchPanels>(EMPTY_SEARCH_PANELS);
  const [canonicalHeader, setCanonicalHeader] = useState<string | null>(null);
  const [chartHistory, setChartHistory] = useState<SearchChartHistoryContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const panelsRef = useRef(panels);
  const canonicalHeaderRef = useRef(canonicalHeader);
  const chartHistoryRef = useRef(chartHistory);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    panelsRef.current = panels;
  }, [panels]);

  useEffect(() => {
    canonicalHeaderRef.current = canonicalHeader;
  }, [canonicalHeader]);

  useEffect(() => {
    chartHistoryRef.current = chartHistory;
  }, [chartHistory]);

  useEffect(() => {
    const q = trimmedQuery;
    if (q.length < 2) {
      searchRequestIdRef.current += 1;
      setPanels(EMPTY_SEARCH_PANELS);
      setCanonicalHeader(null);
      setChartHistory(null);
      setSearchError(null);
      setLoading(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setLoading(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      fetchSearchPanels(q)
        .then((result) => {
          if (requestId !== searchRequestIdRef.current) return;
          setPanels(result.panels);
          setCanonicalHeader(result.queryDisplay ?? null);
          setChartHistory(coerceChartContext(result.chartHistory, q));
          setSearchError(result.error ?? null);
        })
        .catch((error) => {
          if (requestId !== searchRequestIdRef.current) return;
          if (isAbortError(error)) return;
          console.error("[search]", error);
          setPanels(EMPTY_SEARCH_PANELS);
          setCanonicalHeader(null);
          setChartHistory(null);
          setSearchError(error instanceof Error ? error.message : "Search failed");
        })
        .finally(() => {
          if (requestId === searchRequestIdRef.current) setLoading(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [trimmedQuery]);

  const isIdle = trimmedQuery.length < 2;
  const panelBusy = loading && !isIdle;

  const showPanels = loading ? panelsRef.current : panels;
  const showChartHistory = loading ? chartHistoryRef.current : chartHistory;
  const yearContext = useMemo(() => detectYearContext(trimmedQuery), [trimmedQuery]);
  const hasChartsHistory =
    showChartHistory != null && isUsableChartHistory(showChartHistory.history);
  const showRvHistoryFull = yearContext.hasYear && hasChartsHistory;
  const hasPanelResults =
    showPanels.albums.length > 0 ||
    showPanels.songs.length > 0 ||
    showPanels.artistsCharts.length > 0;
  const showRvHistoryEntry = !yearContext.hasYear && !isIdle && (hasPanelResults || panelBusy);

  const counts = useMemo(() => panelCounts(showPanels), [showPanels]);
  const statsOptions = useMemo(
    () => ({ hasChartHistory: showRvHistoryFull || showRvHistoryEntry }),
    [showRvHistoryFull, showRvHistoryEntry],
  );
  const countParts = useMemo(
    () => searchCountParts(counts, statsOptions),
    [counts, statsOptions],
  );
  const countsLabel = useMemo(() => {
    if (isIdle) return "Type 2+ characters to open the stacks";
    if (loading) return "Searching the stacks…";
    if (searchError) return searchError;
    return formatResultsStats(counts, statsOptions);
  }, [isIdle, loading, searchError, counts, statsOptions]);

  const showCanonicalHeader = loading
    ? canonicalHeaderRef.current
    : canonicalHeader;
  const queryDisplay = showCanonicalHeader
    ? showCanonicalHeader
    : trimmedQuery
      ? trimmedQuery.toUpperCase()
      : "EXPLORE";
  const subject = showCanonicalHeader
    ? showCanonicalHeader
        .split(/\s+/)
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
    : trimmedQuery.length > 0
      ? trimmedQuery.charAt(0).toUpperCase() + trimmedQuery.slice(1).toLowerCase()
      : "Results";

  const hasAnyResults = searchHasResults(showPanels, showChartHistory, {
    showRvHistoryFull,
    showRvHistoryEntry,
  });
  const showEmpty = !loading && !searchError && !hasAnyResults && !isIdle;

  const hasSongs = showPanels.songs.length > 0;
  const hasAlbums = showPanels.albums.length > 0;
  const artistResults = showPanels.artistsCharts.filter((a) => a.kind === "artist");
  const hasArtists = artistResults.length > 0;
  const albumsViewAllHref = useMemo(
    () => searchAlbumsViewAllHref(showPanels, showChartHistory?.artistSlug),
    [showPanels, showChartHistory?.artistSlug],
  );
  const songsViewAllHref = useMemo(
    () => searchSongsViewAllHref(showPanels, showChartHistory?.artistSlug),
    [showPanels, showChartHistory?.artistSlug],
  );

  useEffect(() => {
    if (isIdle || loading) return;
    console.log("[search]", {
      songs: showPanels.songs.length,
      artists: showPanels.artistsCharts.filter((a) => a.kind === "artist").length,
      artistsCharts: showPanels.artistsCharts.length,
      rvHistoryEntry: showRvHistoryEntry,
      rvHistoryFull: showRvHistoryFull,
      rvYear: yearContext.rvYear,
      chartEntries: showChartHistory?.history?.entries?.length ?? 0,
      albums: showPanels.albums.length,
      hasAnyResults,
      showEmpty,
    });
  }, [
    isIdle,
    loading,
    showPanels,
    showRvHistoryEntry,
    showRvHistoryFull,
    yearContext.rvYear,
    showChartHistory,
    hasAnyResults,
    showEmpty,
  ]);

  return (
    <div className="search-page">
      <div className="search-page__grain" aria-hidden="true" />
      <div className="search-page__inner">
        <SearchHeader
          query={query}
          onQueryChange={setQuery}
          onQueryCommit={commitQuery}
          queryDisplay={queryDisplay}
          countsLabel={countsLabel}
          countParts={countParts}
          loading={loading}
        />

        {isIdle ? (
          <div className="search-idle" role="status">
            <p className="search-idle__lead">The discovery portal is open.</p>
            <p className="search-idle__hint">
              Keep typing — results appear after 2 characters.
            </p>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="search-empty" role="status">
            <p className="search-empty__lead">The crates came back quiet.</p>
            <p className="search-empty__hint">
              Try a canonical artist, album title, or chart year — another spelling might
              still be in the stacks.
            </p>
          </div>
        ) : null}

        {hasAnyResults || panelBusy ? (
          <div
            className={`search-panels${panelBusy ? " search-panels--pending" : ""}`}
            aria-busy={panelBusy}
          >
            {hasArtists ? (
              <ResultsPanel
                id="artists"
                title="Artists"
                subtitle={panelSubtitle("artists", subject, trimmedQuery)}
                viewAllHref={
                  artistResults.find((a) => a.artistHref?.startsWith("/artist/"))
                    ?.artistHref ?? "/rv/1978"
                }
                viewAllLabel="Artist exhibit →"
                tone="artists"
              >
                {artistResults.map((item, index) => (
                  <DiscoverCard
                    key={`artist-${item.id}-${index}`}
                    variant="artist-chart"
                    title={item.title}
                    line2={item.subtitle}
                    coverUrl={item.coverUrl}
                    coverInitials={coverInitialsFromTitle(item.title)}
                    ariaLabel={`Artist: ${item.title}`}
                    href={item.artistHref ?? item.href}
                  />
                ))}
              </ResultsPanel>
            ) : null}

            {hasAlbums ? (
              <ResultsPanel
                id="albums"
                title="Albums"
                subtitle={panelSubtitle("albums", subject, trimmedQuery)}
                viewAllHref={albumsViewAllHref}
                viewAllLabel="View all albums →"
                tone="albums"
              >
                {showPanels.albums.map((item, index) => (
                  <DiscoverCard
                    key={`album-${item.id}-${index}`}
                    variant="album"
                    title={item.title}
                    line2={item.artist}
                    line3={
                      item.chartNote ??
                      (item.year > 0 ? String(item.year) : undefined)
                    }
                    releaseYear={item.year > 0 ? item.year : null}
                    coverUrl={item.coverUrl}
                    coverInitials={coverInitialsFromTitle(item.title)}
                    ariaLabel={`Album: ${item.title} by ${item.artist}, ${item.year}`}
                    href={item.href}
                  />
                ))}
              </ResultsPanel>
            ) : null}

            {hasSongs ? (
              <SearchSongsJukeboxPanel
                key={`songs-stack-${trimmedQuery}-${showPanels.songs.length}`}
                viewAllHref={songsViewAllHref}
                viewAllLabel="View all songs →"
                songs={showPanels.songs}
              />
            ) : null}

            {showRvHistoryEntry ? <SearchRvHistoryEntryPanel /> : null}

            {showRvHistoryFull && showChartHistory ? (
              <SearchChartsHistoryPanel
                key={`rv-history-${trimmedQuery}-${yearContext.rvYear}-${showChartHistory.history.entries.length}`}
                context={showChartHistory}
                initialRvYear={normalizeRVYear(yearContext.rvYear)}
              />
            ) : null}
          </div>
        ) : null}

      </div>
    </div>
  );
}
