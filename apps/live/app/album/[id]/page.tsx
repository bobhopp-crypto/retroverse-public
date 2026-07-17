import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadAlbumPage } from "@/lib/album/load-album-page";
import { resolveCanonicalAlbum } from "@/lib/public/canonical-public-resolver";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { localPublicTraceEnabled, timePublicLoader } from "@/lib/public/local-trace";

import { AlbumPageView } from "./album-page-view";

const RE_RVAL = /^RVAL\d{6}$/i;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const raw = decodeURIComponent(id).trim();
  const canonical = RE_RVAL.test(raw) ? await resolveCanonicalAlbum(raw) : null;
  const data = canonical ? await loadAlbumPage(canonical.rval) : null;
  return {
    title: data ? `${data.title} — ${data.artistName} — RetroVerse` : "Album — RetroVerse",
    description: data
      ? `${data.title} by ${data.artistName} — album journey, tracklist, and chart history in RetroVerse.`
      : undefined,
  };
}

export default async function AlbumPage({ params, searchParams }: Props) {
  const id = decodeURIComponent((await params).id).trim();
  const traceEnabled = localPublicTraceEnabled(searchParams ? await searchParams : undefined);
  const canonical = RE_RVAL.test(id) ? await resolveCanonicalAlbum(id) : null;
  if (!canonical) notFound();

  const pageLoad = await timePublicLoader("album-page", () => loadAlbumPage(canonical.rval));
  if (!pageLoad.value) notFound();

  return (
    <>
      <AlbumPageView data={pageLoad.value} />
      <CanonicalPublicTrace
        enabled={traceEnabled}
        artistId={canonical.artistId}
        albumId={canonical.albumId}
        primaryAlbum={canonical.title}
        resolverPath={canonical.resolverPath}
        discoverySources={discoverySourcesForPage("album")}
        loaderTimings={[...canonical.loaderTimings, pageLoad.timing]}
      />
    </>
  );
}
