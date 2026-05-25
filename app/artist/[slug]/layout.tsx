import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { loadArtistExhibitShell } from "@/lib/artist/load-artist-exhibit-shell";

import { ArtistExhibitScroll } from "./artist-exhibit-scroll";
import { ArtistExhibitShell } from "./artist-exhibit-shell";
import "./artist-page.css";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ArtistSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const shell = await loadArtistExhibitShell(slug);
  if (!shell) notFound();

  return (
    <ArtistExhibitShell shell={shell}>
      <ArtistExhibitScroll slug={shell.slug} />
      {children}
    </ArtistExhibitShell>
  );
}
