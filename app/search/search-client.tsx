"use client";

import { useMemo, useState } from "react";
import { coverInitialsFromTitle, DiscoverCard } from "./components/discover-card";
import { ResultsPanel } from "./components/results-panel";
import { SearchHeader } from "./components/search-header";
import { filterSearchPanels, panelCounts } from "@/lib/search/filter-panels";
import { MOCK_SEARCH_PANELS } from "@/lib/search/mock-panels";

export default function SearchClient() {
  const [query, setQuery] = useState("");

  const panels = useMemo(
    () => filterSearchPanels(MOCK_SEARCH_PANELS, query),
    [query],
  );

  const counts = useMemo(() => panelCounts(panels), [panels]);

  const displayTitle = query.trim() ? query.trim() : "Explore the archive";

  const countsLabel =
    counts.total === 0
      ? "No results — try another search"
      : `${counts.albums} album${counts.albums === 1 ? "" : "s"} · ${counts.songs} song${counts.songs === 1 ? "" : "s"} · ${counts.artistsCharts} artist${counts.artistsCharts === 1 ? "" : "s"} & chart${counts.artistsCharts === 1 ? "" : "s"}`;

  const hasAnyResults = counts.total > 0;

  return (
    <div className="search-page">
      <div className="search-page__inner">
        <SearchHeader
          query={query}
          onQueryChange={setQuery}
          displayTitle={displayTitle}
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
                count={panels.albums.length}
                tone="albums"
              >
                {panels.albums.map((item, index) => (
                  <DiscoverCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.artist}
                    year={item.year}
                    note={item.chartNote}
                    hasVdj={item.hasVdj}
                    coverAccent={item.coverAccent}
                    coverUrl={item.coverUrl}
                    coverInitials={coverInitialsFromTitle(item.title)}
                    index={index}
                    ariaLabel={`Album: ${item.title} by ${item.artist}, ${item.year}`}
                  />
                ))}
              </ResultsPanel>
            ) : null}

            {panels.songs.length > 0 ? (
              <ResultsPanel
                id="songs"
                title="Songs"
                count={panels.songs.length}
                tone="songs"
              >
                {panels.songs.map((item, index) => (
                  <DiscoverCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.artist}
                    year={item.year}
                    note={item.chartNote}
                    hasVdj={item.hasVdj}
                    coverAccent={item.coverAccent}
                    coverUrl={item.coverUrl}
                    coverInitials={coverInitialsFromTitle(item.title, 2)}
                    index={index}
                    ariaLabel={`Song: ${item.title} by ${item.artist}, ${item.year}`}
                  />
                ))}
              </ResultsPanel>
            ) : null}

            {panels.artistsCharts.length > 0 ? (
              <ResultsPanel
                id="artists-charts"
                title="Artists & Charts"
                count={panels.artistsCharts.length}
                tone="artists"
              >
                {panels.artistsCharts.map((item, index) => (
                  <DiscoverCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    year={item.year}
                    note={item.chartNote}
                    badge={item.kind === "chart" ? "Chart" : "Artist"}
                    hasVdj={item.hasVdj}
                    coverAccent={item.coverAccent}
                    coverInitials={coverInitialsFromTitle(item.title, 2)}
                    index={index}
                    ariaLabel={`${item.kind}: ${item.title}, ${item.year}`}
                  />
                ))}
              </ResultsPanel>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
