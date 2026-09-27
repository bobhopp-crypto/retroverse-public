import "server-only";

import type { ArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import { emptyCoverageSummary } from "@/lib/charts/coverage-summary";
import type { DossierArtistShelf } from "@/lib/artist/dossier-group";
import type { StarterArtist } from "@/lib/artist/starter-artists";
import type { ArtistPageData } from "@/lib/artist/types";

export function starterPageModel(
  artist: StarterArtist,
  shelf: DossierArtistShelf | null,
): { data: ArtistPageData; coverage: ArtistCoverageSummary } {
  const songs = shelf?.songs ?? [];
  const coverageSongs = songs.map((song, index) => {
    const publicRvtr = song.trackHref.match(/RVTR\d{6}/i)?.[0]?.toUpperCase() ?? "";
    return {
      rvtr: publicRvtr || `row-${index}`,
      title: song.title,
      trackHref: song.trackHref,
      peakHot100: null,
      chartWeeks: 0,
      firstChartYear: song.year,
      firstChartDate: null,
      coverageStatus: publicRvtr && song.vdjIdentity ? ("owned" as const) : ("missing" as const),
    };
  });

  const data: ArtistPageData = {
    slug: artist.slug,
    displayName: artist.name,
    canonicalName: artist.name,
    artistId: 0,
    fileCode: "",
    heroImageUrl: null,
    activeRange: "—",
    libraryTracks: shelf?.collectionCount ?? 0,
    libraryAlbums: 0,
    essentialAlbums: [],
    signatureTracks: [],
    dominantYears: [],
    chartDecades: [],
    hasDominantYearData: false,
    chartAlbumSpotlight: null,
    chartHighlights: {
      hot100Appearances: 0,
      b200Albums: 0,
      top10Hits: 0,
      top10Albums: 0,
    },
    chartHistory: null,
    relatedArtists: (shelf?.related ?? []).map((rel, index) => ({
      artistId: index + 1,
      name: rel.name,
      slug: rel.href.replace(/^\/artist\//, ""),
      coverUrl: null,
    })),
    exploreLinks: [],
  };

  return {
    data,
    coverage: {
      slug: artist.slug,
      displayName: artist.name,
      summary: emptyCoverageSummary(),
      songs: coverageSongs,
    },
  };
}
