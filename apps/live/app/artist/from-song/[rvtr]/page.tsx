import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { artistInDepthHref } from "@/lib/artist/artist-in-depth-gesture";
import { loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";

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
 * Swipe-down landing. Redirects only when the song already has a canonical
 * artist route. Otherwise a minimal archive page — never a 404.
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
  let name = hinted || "This artist";
  let songHref: string | null = null;
  let canonicalHref: string | null = null;

  if (RVTR_RE.test(normalized)) {
    try {
      const payload = await loadPublicSongPayload(normalized);
      if (payload?.artist?.trim()) name = payload.artist.trim();
      songHref = payload?.links.songHref ?? null;
      const resolved = artistInDepthHref({ artistHref: payload?.links.artistHref ?? null });
      if (resolved && !resolved.startsWith("/artist/from-song/")) canonicalHref = resolved;
    } catch {
      if (!hinted) name = "This artist";
    }
  }

  if (canonicalHref) redirect(canonicalHref);

  return <ArtistDepthFallback name={name} songHref={songHref} />;
}
