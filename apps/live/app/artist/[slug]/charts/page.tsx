import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";

import { ArtistChartsHistory } from "../artist-charts-history";
import { ArtistCoveragePanelClient } from "../artist-coverage-panel-client";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistChartsPage({ params }: Props) {
  const { slug } = await params;
  const [data, coverage] = await Promise.all([
    loadArtistPage(slug, { includeChartHistory: true, chartScope: "full" }),
    loadArtistCoverageSummary(slug),
  ]);

  if (data.chartHistory) {
    return (
      <>
        <ArtistCoveragePanelClient
          summary={coverage.summary}
          displayName={coverage.displayName}
          slug={coverage.slug}
        />
        <ArtistChartsHistory
          artistName={data.displayName}
          history={data.chartHistory}
          highlightTrackIds={data.signatureTracks.map((t) => t.rvtr)}
          coverageByRvtr={Object.fromEntries(
            coverage.songs.map((song) => [song.rvtr, song.coverageStatus]),
          )}
        />
      </>
    );
  }

  return (
    <ArtistSectionPlaceholder
      slug={data.slug}
      displayName={data.displayName}
      title="Chart history"
    />
  );
}
