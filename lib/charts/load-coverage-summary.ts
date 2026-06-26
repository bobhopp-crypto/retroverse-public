import "server-only";

import { slugFromArtistName } from "@/lib/artist/slug";
import {
  aggregateCoverageSummary,
  type ArtistCoverageRow,
  type CoverageSummaryMetrics,
  type YearCoverageRow,
} from "@/lib/charts/coverage-summary";
import { loadChartUniverseIndex } from "@/lib/ops/browser-plus/chart-universe";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

export type ChartUniverseCoverageReport = {
  library: CoverageSummaryMetrics;
  byYear: YearCoverageRow[];
  byArtist: ArtistCoverageRow[];
};

function aggregateGrouped<K extends string | number>(
  groups: Map<K, TrackCoverageStatus[]>,
): Map<K, CoverageSummaryMetrics> {
  const out = new Map<K, CoverageSummaryMetrics>();
  for (const [key, statuses] of groups) {
    out.set(key, aggregateCoverageSummary(statuses));
  }
  return out;
}

/** Hot 100 chart universe — owned / YouTube / missing breakdown. */
export async function loadChartUniverseCoverageReport(
  artistLimit = 60,
): Promise<ChartUniverseCoverageReport> {
  const chartIndex = await loadChartUniverseIndex();
  const rvtrs = [...chartIndex.hot100Rvtrs];
  const coverageMap = await loadTrackCoverageByRvtr(rvtrs);

  const statuses = rvtrs.map((rvtr) => coverageMap.get(rvtr) ?? "missing");
  const library = aggregateCoverageSummary(statuses);

  const byYearGroups = new Map<number, TrackCoverageStatus[]>();
  const byArtistGroups = new Map<string, TrackCoverageStatus[]>();

  for (const rvtr of rvtrs) {
    const track = chartIndex.byRvtr.get(rvtr);
    if (!track) continue;
    const status = coverageMap.get(rvtr) ?? "missing";

    const year = track.chart_year;
    if (year != null && year > 0) {
      const bucket = byYearGroups.get(year) ?? [];
      bucket.push(status);
      byYearGroups.set(year, bucket);
    }

    const artist = track.canonical_artist_name.trim();
    if (artist) {
      const bucket = byArtistGroups.get(artist) ?? [];
      bucket.push(status);
      byArtistGroups.set(artist, bucket);
    }
  }

  const yearAggregates = aggregateGrouped(byYearGroups);
  const byYear: YearCoverageRow[] = [...yearAggregates.entries()]
    .map(([year, metrics]) => ({ year, ...metrics }))
    .sort((a, b) => b.year - a.year);

  const artistAggregates = aggregateGrouped(byArtistGroups);
  const byArtist: ArtistCoverageRow[] = [...artistAggregates.entries()]
    .map(([artistName, metrics]) => ({
      artistName,
      slug: slugFromArtistName(artistName),
      ...metrics,
    }))
    .sort((a, b) => b.missing - a.missing || b.total - a.total)
    .slice(0, artistLimit);

  return { library, byYear, byArtist };
}
