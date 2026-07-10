import type { Metadata } from "next";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import { ARTIST_SLUGS } from "@/lib/artist/slug";

import { ArtistPageView } from "./artist-page-view";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return Object.keys(ARTIST_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  return {
    title: data ? `${data.displayName} — Retroverse` : "Artist — Retroverse",
    description: data
      ? `${data.displayName} — charted songs, albums, and years in Retroverse.`
      : undefined,
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const [data, coverage] = await Promise.all([
    loadArtistPage(slug),
    loadArtistCoverageSummary(slug),
  ]);

  return <ArtistPageView data={data} coverage={coverage} />;
}
