"use client";

import { useMemo, useState } from "react";
import { coverInitialsFromTitle, DiscoverCard } from "./components/discover-card";
import { ResultsPanel } from "./components/results-panel";
import { SearchFooterTip } from "./components/search-footer-tip";
import { SearchHeader } from "./components/search-header";
import {
  filterSearchPanels,
  formatResultsStats,
  panelCounts,
} from "@/lib/search/filter-panels";
import { MOCK_SEARCH_PANELS } from "@/lib/search/mock-panels";

export default function SearchClient() {
  const [query, setQuery] = useState("madonna");

  const panels = useMemo(
    () => filterSearchPanels(MOCK_SEARCH_PANELS, query),
    [query],
  );

  const counts = useMemo(() => panelCounts(panels), [panels]);
  const countsLabel = useMemo(() => formatResultsStats(counts), [counts]);

  const queryDisplay = query.trim()
    ? query.trim().toUpperCase()
    : "EXPLORE";

  const hasAnyResults = counts.total > 0;
  const subject = query.trim() ? queryDisplay : "RESULTS";

  return (
    <div className="search-page">
      <div className="search-page__grain" aria-hidden="true" />
      <div className="search-page__inner">
        <SearchHeader
          query={query}
          onQueryChange={setQuery}
          queryDisplay={queryDisplay}
          countsLabel={countsLabel}
        />

        {!hasAnyResults ? (
          <p className="search-empty">No matches yet — try another name or year.</p>
        ) : (
          <div className="search-panels">
            {panels.albums.length > 0 ? (
              <ResultsPanel
                id="albums"
                title="Albums"
                subtitle={query.trim() ? `Explore ${subject} albums` : "Explore albums"}
                viewAllHref="#/albums-placeholder"
                viewAllLabel="View all albums →"
                tone="albums"
              >
                {panels.albums.map((item) => (
                  <DiscoverCard
                    key={item.id}
                    variant="album"
                    title={item.title}
                    line2={item.artist}
                    line3={String(item.year)}
                    coverUrl={item.coverUrl}
                    coverInitials={coverInitialsFromTitle(item.title)}
                    ariaLabel={`Album: ${item.title} by ${item.artist}, ${item.year}`}
                  />
                ))}
              </ResultsPanel>
            ) : null}

            {panels.songs.length > 0 ? (
              <ResultsPanel
                id="songs"
                title="Songs"
                subtitle={query.trim() ? `Browse ${subject} tracks` : "Browse tracks"}
                viewAllHref="#/songs-placeholder"
                viewAllLabel="View all songs →"
                tone="songs"
              >
                {panels.songs.map((item) => (
                  <DiscoverCard
                    key={item.id}
                    variant="song"
                    title={item.title}
                    line2={item.albumTitle}
                    line3={String(item.year)}
                    duration={item.duration}
                    coverUrl={item.coverUrl}
                    coverInitials={coverInitialsFromTitle(item.title, 2)}
                    ariaLabel={`Song: ${item.title} from ${item.albumTitle}, ${item.year}`}
                  />
                ))}
              </ResultsPanel>
            ) : null}

            {panels.artistsCharts.length > 0 ? (
              <ResultsPanel
                id="artists-charts"
                title="Artists & Charts"
                subtitle="Related artists and chart appearances"
                viewAllHref="#/charts-placeholder"
                viewAllLabel="View all charts →"
                tone="artists"
              >
                {panels.artistsCharts.map((item) => (
                  <DiscoverCard
                    key={item.id}
                    variant="artist-chart"
                    title={item.title}
                    line2={item.subtitle}
                    line3={String(item.year)}
                    coverInitials={coverInitialsFromTitle(item.title, 2)}
                    ariaLabel={`${item.kind}: ${item.title}, ${item.year}`}
                  />
                ))}
              </ResultsPanel>
            ) : null}
          </div>
        )}

        <SearchFooterTip />
      </div>
    </div>
  );
}
