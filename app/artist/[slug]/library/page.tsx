import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";

import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistLibraryPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  if (!data) notFound();
  return (
    <ArtistSectionPlaceholder
      slug={data.slug}
      displayName={data.displayName}
      title="In Your Library"
    />
  );
}
