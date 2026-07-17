import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

import { ArtistSongsCoverageClient } from "@/app/artist/[slug]/artist-songs-coverage-client";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  const data = canonical ? await loadArtistCoverageSummary(canonical.routeToken) : null;
  return {
    title: data ? `${data.displayName} — Charted Songs — Retroverse` : "Artist — Retroverse",
    description: data ? `${data.displayName} — Hot 100 charted songs with collection coverage in Retroverse.` : undefined,
  };
}

export default async function ArtistSongsPage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  const data = await loadArtistCoverageSummary(canonical.routeToken);

  return <ArtistSongsCoverageClient data={data} />;
}
