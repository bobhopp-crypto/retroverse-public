"use client";

import { useMemo, useState } from "react";

import type { ArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import type { ChartHistorySongRowData } from "@/lib/songs/chart-history-song-row";

import { ChartHistorySongList } from "@/app/components/chart-history-song-list";

import { ArtistCoveragePanel } from "./artist-coverage-panel";

type Props = {
  data: ArtistCoverageSummary;
};

export function ArtistSongsCoverageClient({ data }: Props) {
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const songs = useMemo((): ChartHistorySongRowData[] => {
    const rows: ChartHistorySongRowData[] = data.songs.map((song) => ({
      rvtr: song.rvtr,
      title: song.title,
      trackHref: song.trackHref,
      peakHot100: song.peakHot100,
      chartWeeks: song.chartWeeks,
      firstChartYear: song.firstChartYear,
      firstChartDate: song.firstChartDate,
      coverageStatus: song.coverageStatus,
    }));
    if (!showMissingOnly) return rows;
    return rows.filter((row) => row.coverageStatus === "missing");
  }, [data.songs, showMissingOnly]);

  return (
    <>
      <ArtistCoveragePanel
        displayName={data.displayName}
        summary={data.summary}
        showMissingOnly={showMissingOnly}
        onToggleMissing={() => setShowMissingOnly((current) => !current)}
      />
      <ChartHistorySongList
        artistName={data.displayName}
        artistSlug={data.slug}
        songs={songs}
        mode="page"
        showSortControls
        defaultSortMode="date"
        showCoverageBadges
      />
    </>
  );
}
