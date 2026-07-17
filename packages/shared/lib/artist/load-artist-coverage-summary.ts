import "server-only";

import { cache } from "react";

import {
  aggregateCoverageSummary,
  type CoverageSummaryMetrics,
} from "@/lib/charts/coverage-summary";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import { loadCanonicalArtistTracks } from "@/lib/artist/load-canonical-artist-tracks";
import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";
import { trackPageHref } from "@/lib/search/entity-routes";

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
  const artist = await resolveArtistFromSlug(slug);
  if (!artist) {
    return {
      slug: "0",
      displayName: "Unknown artist",
      summary: aggregateCoverageSummary([]),
      songs: [],
    };
  }

  const trackRows = (await loadCanonicalArtistTracks(artist.artistId)).filter(
    (row) => row.has_hot100 && row.peak_hot100_position != null,
  );
  const rvtrs = trackRows.map((row) => row.track_id.trim().toUpperCase());
  const coverageMap = await loadTrackCoverageByRvtr(rvtrs);

  const songs: ArtistCoverageSong[] = trackRows.map((row) => {
    const rvtr = row.track_id.trim().toUpperCase();
    const firstChartDate = row.first_chart_date?.trim() || null;
    const firstChartYear = firstChartDate ? Number(firstChartDate.slice(0, 4)) : null;
    return {
      rvtr,
      title: row.canonical_title.trim(),
      trackHref: trackPageHref(rvtr),
      peakHot100: row.peak_hot100_position,
      chartWeeks: row.chart_weeks,
      firstChartYear:
        firstChartYear != null && Number.isFinite(firstChartYear) ? firstChartYear : null,
      firstChartDate,
      coverageStatus: coverageMap.get(rvtr) ?? "missing",
    };
  });

  const summary = aggregateCoverageSummary(songs.map((song) => song.coverageStatus));

  return {
    slug: artist.slug,
    displayName: artist.displayName,
    summary,
    songs,
  };
}

export const loadArtistCoverageSummary = cache(loadArtistCoverageSummaryImpl);
