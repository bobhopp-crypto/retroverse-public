import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";

import { ArtistChartsHistory } from "../artist-charts-history";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistChartsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug, { chartScope: "full" });
  if (!data) notFound();

  if (data.chartHistory) {
    return (
      <div className="artist-exhibit artist-exhibit--section">
        <ArtistChartsHistory
          artistName={data.displayName}
          history={data.chartHistory}
          highlightTrackIds={data.signatureTracks.map((t) => t.rvtr)}
        />
      </div>
    );
  }

  return (
    <ArtistSectionPlaceholder
      slug={data.slug}
      displayName={data.displayName}
      title="Chart History"
    />
  );
}
