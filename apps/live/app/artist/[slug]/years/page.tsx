import { loadArtistPage } from "@/lib/artist/load-artist-page";

import { ArtistChartActivity } from "../artist-chart-activity";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistYearsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);

  if (data.chartDecades.length === 0) {
    return (
      <ArtistSectionPlaceholder
        slug={data.slug}
        displayName={data.displayName}
        title="Chart activity"
      />
    );
  }

  return <ArtistChartActivity slug={data.slug} decades={data.chartDecades} />;
}
