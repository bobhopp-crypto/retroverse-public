import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { resolveFromSongArtist } from "@/lib/artist/from-song-artist";
import { loadTrackPage } from "@/lib/track/load-track-page";

import { ArtistDepthFallback } from "../../artist-depth-fallback";

type Props = {
  params: Promise<{ rvtr: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

const RVTR_RE = /^RVTR\d{6}$/i;

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return { title: "Artist — Retroverse" };
}

/**
 * Swipe-down landing. The static track page is the song→artist link
 * (`artistHref` / `artistSlug`). A display name never mints an RVAR.
 * Unknown songs stay on the archive page — never a 404.
 */
function hintedName(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
}

export default async function ArtistFromSongPage({ params, searchParams }: Props) {
  const { rvtr } = await params;
  const query = searchParams ? await searchParams : {};
  const normalized = decodeURIComponent(rvtr).trim().toUpperCase();
  const hinted = hintedName(query.name);
  let track = null;
  if (RVTR_RE.test(normalized)) {
    try {
      track = await loadTrackPage(normalized);
    } catch {
      track = null;
    }
  }

  const resolved = resolveFromSongArtist({ rvtr: normalized, track, hintedName: hinted });
  if (resolved.canonicalHref) redirect(resolved.canonicalHref);

  return <ArtistDepthFallback name={resolved.name} songHref={resolved.songHref} />;
}
