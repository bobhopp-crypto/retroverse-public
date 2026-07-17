import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadArtistAlbums } from "@/lib/artist/load-artist-albums";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

import { ArtistAlbumsCatalog } from "../artist-albums-catalog";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  const data = canonical ? await loadArtistAlbums(canonical.routeToken) : null;
  return {
    title: data ? `${data.displayName} — Albums — Retroverse` : "Artist — Retroverse",
    description: data ? `${data.displayName} — full discography in release order in Retroverse.` : undefined,
  };
}

export default async function ArtistAlbumsPage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  const data = await loadArtistAlbums(canonical.routeToken);

  return <ArtistAlbumsCatalog artistName={data.displayName} albums={data.albums} />;
}
