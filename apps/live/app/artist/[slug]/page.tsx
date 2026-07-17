import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import { resolveCanonicalArtist, resolveLegacyArtistId } from "@/lib/public/canonical-public-resolver";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { localPublicTraceEnabled, timePublicLoader } from "@/lib/public/local-trace";

import { ArtistPageView } from "./artist-page-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
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
  if (!canonical) notFound();
  const [pageLoad, coverageLoad] = await Promise.all([
    timePublicLoader("artist-page", () => loadArtistPage(canonical.routeToken)),
    timePublicLoader("artist-coverage", () => loadArtistCoverageSummary(canonical.routeToken)),
  ]);

  return (
    <>
      <ArtistPageView data={pageLoad.value} coverage={coverageLoad.value} />
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
