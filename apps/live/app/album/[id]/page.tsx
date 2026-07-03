import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { resolveAlbumRvalParam } from "@/lib/album/resolve-album-route";

import { AlbumPageView } from "./album-page-view";

const RE_RVAL = /^RVAL\d{6}$/i;

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

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

  const rval = RE_RVAL.test(id) ? id.toUpperCase() : await resolveAlbumRvalParam(id);
  if (!rval) notFound();

  const data = await loadAlbumPage(rval);
  if (!data) notFound();

  return <AlbumPageView data={data} />;
}
