import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

import { ArtistChartsHistory } from "../artist-charts-history";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistChartsPage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  const data = await loadArtistPage(canonical.routeToken, { includeChartHistory: true, chartScope: "full" });

  if (data.chartHistory) {
    return (
      <ArtistChartsHistory
        artistName={data.displayName}
        canonicalArtistId={data.artistId}
        history={data.chartHistory}
        highlightTrackIds={data.signatureTracks.map((t) => t.rvtr)}
      />
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
