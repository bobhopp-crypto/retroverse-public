import { resolveArtistFromSlug, artistPagePath } from "@/lib/artist/resolve-artist";
import { coverageFromMap } from "@/lib/charts/track-coverage";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import { rvtrsFromChartLeaders } from "@/lib/charts/rvtrs-from-chart-history";
import { fillHeroCoverGrid } from "@/lib/rv-year/hero-cover-fill";
import {
  buildRvYearDestination,
  type RvYearDestination,
  type RvYearDestinationDraft,
} from "@/lib/rv-year/rv-year-destination";

export async function enrichRvYearDestination(
  destination: RvYearDestinationDraft,
): Promise<RvYearDestination> {
  const fill = await fillHeroCoverGrid(destination.heroCoverCandidates);

  const definingArtists = await Promise.all(
    destination.definingArtists.map(async (artist) => {
      const resolved = await resolveArtistFromSlug(artist.slug);
      if (resolved) {
        return {
          ...artist,
          name: resolved.displayName,
          slug: resolved.slug,
          href: `/artist/${resolved.slug}`,
        };
      }
      const fallback = artistPagePath(artist.name);
      if (!fallback) return { ...artist, href: null };
      const fallbackResolved = await resolveArtistFromSlug(fallback.slice("/artist/".length));
      return fallbackResolved
        ? {
            ...artist,
            name: fallbackResolved.displayName,
            slug: fallbackResolved.slug,
            href: `/artist/${fallbackResolved.slug}`,
          }
        : { ...artist, href: null };
    }),
  );

  const coverageMap = await loadTrackCoverageByRvtr(rvtrsFromChartLeaders(destination.topSingles));
  const topSingles = destination.topSingles.map((leader) => ({
    ...leader,
    coverageStatus: leader.rvtr ? coverageFromMap(coverageMap, leader.rvtr) : null,
  }));

  return {
    essentialAlbums: destination.essentialAlbums,
    heroCovers: fill.covers,
    definingArtists,
    definingSongs: destination.definingSongs,
    topSingles,
    topAlbums: destination.topAlbums,
  };
}

export { buildRvYearDestination };
