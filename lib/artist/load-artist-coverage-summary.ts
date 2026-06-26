import "server-only";

import { cache } from "react";

import {
  aggregateCoverageSummary,
  type CoverageSummaryMetrics,
} from "@/lib/charts/coverage-summary";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import { loadArtistChartedSongs } from "@/lib/artist/load-artist-charted-songs";

export type ArtistCoverageSong = {
  rvtr: string;
  title: string;
  trackHref: string;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartYear: number | null;
  firstChartDate: string | null;
  coverageStatus: TrackCoverageStatus;
};

export type ArtistCoverageSummary = {
  slug: string;
  displayName: string;
  summary: CoverageSummaryMetrics;
  songs: ArtistCoverageSong[];
};

async function loadArtistCoverageSummaryImpl(slug: string): Promise<ArtistCoverageSummary> {
  const charted = await loadArtistChartedSongs(slug);
  const rvtrs = charted.songs.map((song) => song.rvtr);
  const coverageMap = await loadTrackCoverageByRvtr(rvtrs);

  const songs: ArtistCoverageSong[] = charted.songs.map((song) => ({
    rvtr: song.rvtr,
    title: song.title,
    trackHref: song.trackHref,
    peakHot100: song.peakHot100,
    chartWeeks: song.chartWeeks,
    firstChartYear: song.firstChartYear,
    firstChartDate: song.firstChartDate,
    coverageStatus: coverageMap.get(song.rvtr) ?? "missing",
  }));

  const summary = aggregateCoverageSummary(songs.map((song) => song.coverageStatus));

  return {
    slug: charted.slug,
    displayName: charted.displayName,
    summary,
    songs,
  };
}

export const loadArtistCoverageSummary = cache(loadArtistCoverageSummaryImpl);
