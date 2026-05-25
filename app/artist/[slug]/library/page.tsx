import { notFound } from "next/navigation";

import { loadArtistExhibitShell } from "@/lib/artist/load-artist-exhibit-shell";

import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistLibraryPage({ params }: Props) {
  const { slug } = await params;
  const shell = await loadArtistExhibitShell(slug);
  if (!shell) notFound();
  return (
    <ArtistSectionPlaceholder
      slug={shell.slug}
      displayName={shell.displayName}
      title="In Your Library"
    />
  );
}
