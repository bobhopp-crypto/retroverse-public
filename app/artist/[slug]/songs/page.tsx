import type { Metadata } from "next";

import { ChartHistorySongList } from "@/app/components/chart-history-song-list";
import { loadArtistChartedSongs } from "@/lib/artist/load-artist-charted-songs";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtistChartedSongs(slug);
  return {
    title: `${data.displayName} — Charted Songs — Retroverse`,
    description: `${data.displayName} — Hot 100 charted songs ranked by peak in Retroverse.`,
  };
}

export default async function ArtistSongsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistChartedSongs(slug);

  return (
    <ChartHistorySongList
      artistName={data.displayName}
      artistSlug={data.slug}
      songs={data.songs}
      mode="page"
    />
  );
}
