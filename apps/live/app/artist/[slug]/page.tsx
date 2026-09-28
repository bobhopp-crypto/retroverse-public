import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { loadCompanionStillUrls } from "@/lib/artist/companion-still";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import { resolveLiveArtistName } from "@/lib/artist/resolve-artist";
import { starterArtistBySlug } from "@/lib/artist/starter-artists";
import { canonicalArtistHref, resolveCanonicalArtist, resolveLegacyArtistId } from "@/lib/public/canonical-public-resolver";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { localPublicTraceEnabled, timePublicLoader } from "@/lib/public/local-trace";

import { ArtistDepthFallback } from "../artist-depth-fallback";
import { ArtistPageView } from "./artist-page-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  const starter = starterArtistBySlug(slug);
  if (!canonical && starter) {
    return {
      title: `${starter.name} — Retroverse`,
      description: `${starter.name} — songs and archive notes in Retroverse.`,
    };
  }
  const data = canonical ? await loadArtistPage(canonical.routeToken) : null;
  return {
    title: data ? `${data.displayName} — Retroverse` : "Artist — Retroverse",
    description: data
      ? `${data.displayName} — charted songs, albums, and years in Retroverse.`
      : undefined,
  };
}

export default async function ArtistPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const traceEnabled = localPublicTraceEnabled(searchParams ? await searchParams : undefined);
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) {
    const legacy = await resolveLegacyArtistId(slug);
    if (legacy) redirect(legacy.href);
  }
  if (!canonical) {
    const starter = starterArtistBySlug(slug);
    if (!starter) notFound();
    const live = await resolveLiveArtistName(starter.name);
    if (live) redirect(canonicalArtistHref(live.rvar));
    return <ArtistDepthFallback name={starter.name} />;
  }
  const [pageLoad, coverageLoad] = await Promise.all([
    timePublicLoader("artist-page", () => loadArtistPage(canonical.routeToken)),
    timePublicLoader("artist-coverage", () => loadArtistCoverageSummary(canonical.routeToken)),
  ]);
  const stillByRvtr = await loadCompanionStillUrls([
    ...coverageLoad.value.songs.map((song) => song.rvtr),
    ...pageLoad.value.signatureTracks.map((track) => track.rvtr),
  ]);

  return (
    <>
      <ArtistPageView
        data={pageLoad.value}
        coverage={coverageLoad.value}
        stillByRvtr={stillByRvtr}
      />
      <CanonicalPublicTrace
        enabled={traceEnabled}
        artistId={canonical.artistId}
        resolverPath={canonical.resolverPath}
        discoverySources={discoverySourcesForPage("artist")}
        loaderTimings={[...canonical.loaderTimings, pageLoad.timing, coverageLoad.timing]}
      />
    </>
  );
}
