export type PublicDiscoveryPage = "home" | "song" | "artist" | "album" | "year";

export type DiscoveryShelfContract = {
  id: string;
  purpose: string;
  source: string;
  requiredData: readonly string[];
  displayLabel: string;
  pagesAllowed: readonly PublicDiscoveryPage[];
};

/**
 * The complete public Discovery inventory. Components keep their existing
 * presentation; purpose, source, requirements, labels, and page permission live here.
 */
export const DISCOVERY_SHELF_CONTRACT = {
  homeCurrentSong: {
    id: "home-current-song",
    purpose: "Open the single canonical song selected by Channel Zero.",
    source: "Channel Zero RVTR → Canonical Public Resolver",
    requiredData: ["RVTR", "canonical track"],
    displayLabel: "Now exploring",
    pagesAllowed: ["home"],
  },
  songArtistTracks: {
    id: "song-artist-tracks",
    purpose: "Continue with other canonical tracks by the same canonical artist ID.",
    source: "canonical_track_display.artist_id",
    requiredData: ["canonical artist ID", "RVTR", "cover"],
    displayLabel: "More by {artist}",
    pagesAllowed: ["song"],
  },
  songArtistAlbums: {
    id: "song-artist-albums",
    purpose: "Explore canonical RVAL albums owned by the canonical artist ID.",
    source: "albums.artist_id + album_external_keys",
    requiredData: ["canonical artist ID", "RVAL", "cover"],
    displayLabel: "Essential listening",
    pagesAllowed: ["song"],
  },
  artistTopSongs: {
    id: "artist-top-songs",
    purpose: "Introduce the artist through canonical charted RVTRs.",
    source: "canonical_track_display.artist_id + chart facts",
    requiredData: ["canonical artist ID", "RVTR"],
    displayLabel: "Songs that defined the run",
    pagesAllowed: ["artist"],
  },
  artistAlbums: {
    id: "artist-albums",
    purpose: "Explore the artist's canonical RVAL album catalog.",
    source: "albums.artist_id + album_external_keys",
    requiredData: ["canonical artist ID", "RVAL"],
    displayLabel: "Albums to explore",
    pagesAllowed: ["artist"],
  },
  artistYears: {
    id: "artist-years",
    purpose: "Move from a canonical artist ID into years containing chart relationships.",
    source: "chart_appearances via tracks.artist_id",
    requiredData: ["canonical artist ID", "canonical year"],
    displayLabel: "Years in motion",
    pagesAllowed: ["artist"],
  },
  artistRelatedArtists: {
    id: "artist-related-artists",
    purpose: "Explore canonical artists with chart co-occurrence evidence.",
    source: "chart co-occurrence → artists.id",
    requiredData: ["canonical artist ID", "related canonical artist ID"],
    displayLabel: "Keep exploring",
    pagesAllowed: ["artist"],
  },
  albumSimilarJourneys: {
    id: "album-similar-journeys",
    purpose: "Compare this RVAL with canonical albums having similar chart trajectories.",
    source: "Billboard 200 canonical album relationships",
    requiredData: ["RVAL", "album chart trajectory"],
    displayLabel: "Similar chart journeys",
    pagesAllowed: ["album"],
  },
  albumBreakoutSongs: {
    id: "album-breakout-songs",
    purpose: "Open canonical RVTR highlights that charted from this RVAL.",
    source: "RVAL track sequence + canonical chart relationships",
    requiredData: ["RVAL", "RVTR", "canonical chart relationship"],
    displayLabel: "Breakout songs",
    pagesAllowed: ["album"],
  },
  albumRelatedEntities: {
    id: "album-related-entities",
    purpose: "Continue from an RVAL to its canonical artist, year, songs, or chart week.",
    source: "Canonical Public Resolver album identity",
    requiredData: ["RVAL", "canonical artist ID"],
    displayLabel: "Explore further",
    pagesAllowed: ["album"],
  },
  yearDefiningSongs: {
    id: "year-defining-songs",
    purpose: "Explore canonical RVTR leaders for the selected year.",
    source: "canonical year chart relationships",
    requiredData: ["canonical year", "RVTR"],
    displayLabel: "Defining songs",
    pagesAllowed: ["year"],
  },
  yearEssentialAlbums: {
    id: "year-essential-albums",
    purpose: "Explore canonical RVAL album leaders for the selected year.",
    source: "canonical year Billboard 200 relationships",
    requiredData: ["canonical year", "RVAL"],
    displayLabel: "Essential albums",
    pagesAllowed: ["year"],
  },
  yearDefiningArtists: {
    id: "year-defining-artists",
    purpose: "Open canonical artist IDs derived from the year's RVTR leaders.",
    source: "year RVTR → canonical artist ID",
    requiredData: ["canonical year", "RVTR", "canonical artist ID"],
    displayLabel: "Defining artists",
    pagesAllowed: ["year"],
  },
} as const satisfies Record<string, DiscoveryShelfContract>;

export type DiscoveryShelfKey = keyof typeof DISCOVERY_SHELF_CONTRACT;

export function discoveryShelf(
  key: DiscoveryShelfKey,
  replacements: Record<string, string | number> = {},
): DiscoveryShelfContract {
  const contract = DISCOVERY_SHELF_CONTRACT[key];
  return {
    ...contract,
    displayLabel: contract.displayLabel.replace(/\{([^}]+)\}/g, (token, field: string) =>
      replacements[field] == null ? token : String(replacements[field]),
    ),
  };
}

export function discoverySourcesForPage(page: PublicDiscoveryPage): string[] {
  return Object.values(DISCOVERY_SHELF_CONTRACT)
    .filter((contract) => contract.pagesAllowed.includes(page as never))
    .map((contract) => `${contract.id}: ${contract.source}`);
}
