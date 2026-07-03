import type { ReactNode } from "react";

import { loadArtistExhibitShell } from "@/lib/artist/load-artist-exhibit-shell";
import { loadArtistYoutubeVideoCount } from "@/lib/youtube/load-artist-video-count";
import {
  artistFileCode,
  artistNameFromSlug,
  displayArtistName,
} from "@/lib/artist/slug";

import { ArtistExhibitScroll } from "./artist-exhibit-scroll";
import { ArtistExhibitShell } from "./artist-exhibit-shell";
import "./artist-page.css";

import type { ArtistExhibitShellData } from "@/lib/artist/load-artist-exhibit-shell";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

function fallbackArtistShell(slugParam: string): ArtistExhibitShellData {
  const key = slugParam.trim().toLowerCase();
  const knownName = artistNameFromSlug(key);
  const displayName = knownName
    ? displayArtistName(knownName)
    : displayArtistName(key.replace(/-/g, " "));

  return {
    slug: key,
    displayName,
    fileCode: artistFileCode(0, displayName),
    heroImageUrl: null,
  };
}

export default async function ArtistSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const shell = await loadArtistExhibitShell(slug);
  const safeShell = shell ?? fallbackArtistShell(slug);
  const youtubeVideoCount = await loadArtistYoutubeVideoCount(safeShell.displayName);

  return (
    <ArtistExhibitShell shell={safeShell} youtubeVideoCount={youtubeVideoCount}>
      <ArtistExhibitScroll slug={safeShell.slug} />
      {children}
    </ArtistExhibitShell>
  );
}
