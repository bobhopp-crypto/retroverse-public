import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { resolveAlbumRvalParam } from "@/lib/album/resolve-album-route";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { welcomeOrigin } from "@/lib/search/welcome-origin";

import { AlbumPageView } from "./album-page-view";

const RE_RVAL = /^RVAL\d{6}$/i;

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

function redirectWelcomeAlbum(rval: string) {
  const origin = welcomeOrigin();
  if (origin) redirect(`${origin}/albums/${rval.toUpperCase()}`);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const raw = decodeURIComponent(id).trim();
  const rval = RE_RVAL.test(raw) ? raw.toUpperCase() : await resolveAlbumRvalParam(raw);
  const data = rval ? await loadAlbumPage(rval) : null;
  return {
    title: data ? `${data.title} — ${data.artistName} — RetroVerse` : "Album — RetroVerse",
    description: data
      ? `${data.title} by ${data.artistName} — album journey, tracklist, and chart history in RetroVerse.`
      : undefined,
  };
}

export default async function AlbumPage({ params }: Props) {
  const id = decodeURIComponent((await params).id).trim();
  if (!id) notFound();

  const rval = RE_RVAL.test(id) ? id.toUpperCase() : await resolveAlbumRvalParam(id);

  if (rval) {
    const data = await loadAlbumPage(rval);
    if (data) return <AlbumPageView data={data} />;
    redirectWelcomeAlbum(rval);
  }

  const track = await loadTrackPage(id);
  if (track) {
    redirect(`/track/${track.rvtr}`);
  }

  redirect(`/search?q=${encodeURIComponent(id.replace(/-/g, " "))}`);
}
