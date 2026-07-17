import { coverageFromMap } from "@/lib/charts/track-coverage";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import { rvtrsFromChartLeaders } from "@/lib/charts/rvtrs-from-chart-history";
import { resolveCanonicalTracksBatch } from "@/lib/public/canonical-public-resolver";
import { trackPageHref } from "@/lib/search/entity-routes";
import { fillHeroCoverGrid } from "@/lib/rv-year/hero-cover-fill";
import {
  buildRvYearDestination,
  type RvYearDestination,
  type RvYearDestinationDraft,
} from "@/lib/rv-year/rv-year-destination";

export async function enrichRvYearDestination(
  destination: RvYearDestinationDraft,
): Promise<RvYearDestination> {
  const canonicalRvtrs = [
    ...destination.definingArtists.map((artist) => artist.rvtr),
    ...destination.definingSongs.map((song) => song.rvtr),
    ...destination.topSingles.map((song) => song.rvtr),
  ].filter((rvtr): rvtr is string => Boolean(rvtr));
  const canonicalTracks = await resolveCanonicalTracksBatch(canonicalRvtrs);

  const definingArtists = destination.definingArtists.map((artist) => {
    const track = artist.rvtr ? canonicalTracks.get(artist.rvtr) : null;
    if (!track) return { ...artist, artistId: null, slug: "", href: null };
    return {
      ...artist,
      artistId: track.artist.artistId,
      name: track.artist.displayName,
      slug: track.artist.routeToken,
      href: track.artist.href,
    };
  });

  const definingSongs = destination.definingSongs.map((song) => {
    const track = song.rvtr ? canonicalTracks.get(song.rvtr) : null;
    if (!track) return song;
    return {
      ...song,
      title: track.title,
      artist: track.artist.displayName,
      href: trackPageHref(track.rvtr),
      coverUrl: track.albumResolution.primaryAlbum?.coverUrl ?? null,
    };
  });

  const coverageMap = await loadTrackCoverageByRvtr(rvtrsFromChartLeaders(destination.topSingles));
  const topSingles = destination.topSingles.map((leader) => ({
    ...leader,
    ...(leader.rvtr && canonicalTracks.get(leader.rvtr)
      ? {
          title: canonicalTracks.get(leader.rvtr)!.title,
          artist: canonicalTracks.get(leader.rvtr)!.artist.displayName,
          href: trackPageHref(leader.rvtr),
          coverUrl:
            canonicalTracks.get(leader.rvtr)!.albumResolution.primaryAlbum?.coverUrl ?? null,
        }
      : {}),
    coverageStatus: leader.rvtr ? coverageFromMap(coverageMap, leader.rvtr) : null,
  }));
  const fill = await fillHeroCoverGrid(destination.heroCoverCandidates);

  return {
    essentialAlbums: destination.essentialAlbums,
    heroCovers: fill.covers,
    definingArtists,
    definingSongs,
    topSingles,
    topAlbums: destination.topAlbums,
  };
}

export { buildRvYearDestination };
