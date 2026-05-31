import type { Metadata } from "next";

import { loadArtistAlbums } from "@/lib/artist/load-artist-albums";

import { ArtistAlbumsCatalog } from "../artist-albums-catalog";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtistAlbums(slug);
  return {
    title: `${data.displayName} — Albums — Retroverse`,
    description: `${data.displayName} — full discography in release order in Retroverse.`,
  };
}

export default async function ArtistAlbumsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistAlbums(slug);

  return <ArtistAlbumsCatalog artistName={data.displayName} albums={data.albums} />;
}
