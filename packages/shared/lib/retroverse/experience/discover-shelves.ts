import type { ArtistPageData } from "@/lib/artist/types";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { discoveryShelf } from "@/lib/public/discovery-contract";

export type DiscoverCard = {
  id: string;
  title: string;
  href: string;
  coverUrl: string | null;
  reason: string | null;
};

export type DiscoverShelf = {
  id: string;
  title: string;
  reason: string | null;
  cards: DiscoverCard[];
};

const MIN_SHELF_CARDS = 2;

function titleCaseName(name: string): string {
  return name.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function dedupeCards(cards: DiscoverCard[]): DiscoverCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = card.href.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cardsWithArtwork(cards: DiscoverCard[]): DiscoverCard[] {
  return cards.filter((card) => Boolean(card.coverUrl?.trim()));
}

function shelfIsRenderable(cards: DiscoverCard[]): boolean {
  const withArt = cardsWithArtwork(cards);
  return withArt.length >= MIN_SHELF_CARDS;
}

const MAX_PRIMARY_SHELVES = 3;
const SHELF_PRIORITY = ["song-artist-tracks", "song-artist-albums"] as const;

export function prioritizeDiscoverShelves(shelves: DiscoverShelf[]): {
  primary: DiscoverShelf[];
  overflow: DiscoverShelf[];
} {
  const byId = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const ordered: DiscoverShelf[] = [];
  for (const id of SHELF_PRIORITY) {
    const shelf = byId.get(id);
    if (shelf) ordered.push(shelf);
  }
  for (const shelf of shelves) {
    if (!ordered.includes(shelf)) ordered.push(shelf);
  }
  return {
    primary: ordered.slice(0, MAX_PRIMARY_SHELVES),
    overflow: ordered.slice(MAX_PRIMARY_SHELVES),
  };
}

function shelfScore(shelfId: string): number {
  switch (shelfId) {
    case "song-artist-tracks":
      return 280;
    case "song-artist-albums":
      return 260;
    default:
      return 250;
  }
}

export { shelfScore as discoverShelfBaseScore };

export function buildDiscoverShelves(input: {
  track: TrackPageData;
  artist: ArtistPageData | null;
  destination: RvYearDestination | null;
  pkg?: SongPackage | null;
  storyBodies?: string[];
}): DiscoverShelf[] {
  const { track, artist } = input;
  const rvtr = track.rvtr.toUpperCase();
  const shelves: DiscoverShelf[] = [];

  if (artist) {
    const artistCards = cardsWithArtwork(
      dedupeCards(
        artist.signatureTracks
          .filter((song) => song.rvtr.toUpperCase() !== rvtr)
          .slice(0, 12)
          .map((song) => ({
            id: song.rvtr,
            title: song.title,
            href: `/retroverse-2/song/${song.rvtr}`,
            coverUrl: song.coverUrl,
            reason: null,
          })),
      ),
    );
    if (shelfIsRenderable(artistCards)) {
      shelves.push({
        id: discoveryShelf("songArtistTracks").id,
        title: discoveryShelf("songArtistTracks", {
          artist: titleCaseName(track.artistName),
        }).displayLabel,
        reason: null,
        cards: artistCards,
      });
    }
  }

  if (artist && artist.essentialAlbums.length > 0) {
    const albumCards = cardsWithArtwork(
      dedupeCards(
        artist.essentialAlbums.slice(0, 10).map((entry) => ({
          id: entry.rval ?? entry.title,
          title: entry.title,
          href: entry.rval ? `/album/${entry.rval}` : `/search?q=${encodeURIComponent(entry.title)}`,
          coverUrl: entry.coverUrl,
          reason: null,
        })),
      ),
    );
    if (shelfIsRenderable(albumCards)) {
      shelves.push({
        id: discoveryShelf("songArtistAlbums").id,
        title: discoveryShelf("songArtistAlbums").displayLabel,
        reason: null,
        cards: albumCards,
      });
    }
  }

  return shelves;
}

export function scoreDiscoverShelf(shelf: DiscoverShelf, cardCountBoost = 0): number {
  return shelfScore(shelf.id) + Math.min(cardCountBoost, 40);
}
