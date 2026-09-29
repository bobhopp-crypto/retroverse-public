import "server-only";

import { cache } from "react";
import { aggregateCoverageSummary, type CoverageSummaryMetrics } from "@/lib/charts/coverage-summary";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";
import { loadStaticArtistRecord } from "@/lib/public/static-catalog-pages";

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

export const loadArtistCoverageSummary = cache(async (slug: string): Promise<ArtistCoverageSummary> => {
  const identity = await resolveCanonicalArtist(slug);
  const record = identity ? await loadStaticArtistRecord(identity.rvar) : null;
  return record?.coverage ?? {
    slug: "0",
    displayName: "Unknown artist",
    summary: aggregateCoverageSummary([]),
    songs: [],
  };
});
