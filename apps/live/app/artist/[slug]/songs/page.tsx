import type { Metadata } from "next";

import { loadArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";

import { ArtistSongsCoverageClient } from "@/app/artist/[slug]/artist-songs-coverage-client";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtistCoverageSummary(slug);
  return {
    title: `${data.displayName} — Charted Songs — Retroverse`,
    description: `${data.displayName} — Hot 100 charted songs with collection coverage in Retroverse.`,
  };
}

export default async function ArtistSongsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistCoverageSummary(slug);

  return <ArtistSongsCoverageClient data={data} />;
}
