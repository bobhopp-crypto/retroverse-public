import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

import { ArtistChartActivity } from "../artist-chart-activity";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistYearsPage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  const data = await loadArtistPage(canonical.routeToken);

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
