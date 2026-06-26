import type { ArtistPageData } from "@/lib/artist/types";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { trackPageHref } from "@/lib/search/entity-routes";

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

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

function chartBeatReason(
  track: TrackPageData,
  peerPeak: number | null,
): "beat" | "lost" | "rival" | null {
  if (track.peakHot100 == null || peerPeak == null) return null;
  if (track.peakHot100 < peerPeak) return "beat";
  if (track.peakHot100 > peerPeak) return "lost";
  if (Math.abs(track.peakHot100 - peerPeak) <= 5) return "rival";
  return null;
}

function relatedShelfTitleFromCards(cards: DiscoverCard[], track: TrackPageData): string {
  let beat = false;
  let lost = false;
  let rival = false;
  for (const card of cards) {
    const peerPeak =
      track.relatedTracks.find((song) => song.rvtr === card.id)?.peakHot100 ??
      null;
    const kind = chartBeatReason(track, peerPeak);
    if (kind === "beat") beat = true;
    if (kind === "lost") lost = true;
    if (kind === "rival") rival = true;
  }
  if (beat && lost) return "Chart Rivals";
  if (beat) return "Keeping It Off #1";
  if (lost) return "The Competition";
  if (rival) return "The Competition";
  return "Related Songs";
}

const MAX_PRIMARY_SHELVES = 3;
const SHELF_PRIORITY = ["artist", "related", "albums", "year", "album"] as const;

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
    case "album":
      return 340;
    case "related":
      return 320;
    case "year":
      return 300;
    case "artist":
      return 280;
    case "albums":
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
  const { track, artist, destination } = input;
  const rvtr = track.rvtr.toUpperCase();
  const year = trackYear(track);
  const album = track.albums[0] ?? null;
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
        id: "artist",
        title: `More by ${titleCaseName(track.artistName)}`,
        reason: null,
        cards: artistCards,
      });
    }
  }

  if (album?.href && album.coverUrl) {
    const albumCards = cardsWithArtwork([
      {
        id: album.rval ?? album.title,
        title: album.title,
        href: album.href,
        coverUrl: album.coverUrl,
        reason: null,
      },
    ]);
    if (shelfIsRenderable(albumCards)) {
      shelves.push({
        id: "album",
        title: `From ${album.title}`,
        reason: null,
        cards: albumCards,
      });
    }
  }

  if (year && destination) {
    const yearCards = cardsWithArtwork(
      dedupeCards(
        destination.definingSongs
          .filter((song): song is typeof song & { href: string } => Boolean(song.href?.trim()))
          .filter((song) => !song.href.toUpperCase().includes(rvtr))
          .slice(0, 12)
          .map((song) => ({
            id: song.href,
            title: song.title,
            href: song.href,
            coverUrl: song.coverUrl,
            reason: null,
          })),
      ),
    );
    if (shelfIsRenderable(yearCards)) {
      shelves.push({
        id: "year",
        title: `Also from ${year}`,
        reason: null,
        cards: yearCards,
      });
    }
  }

  const relatedCards = cardsWithArtwork(
    dedupeCards(
      track.relatedTracks.slice(0, 12).map((song) => ({
        id: song.rvtr,
        title: song.title,
        href: song.href ?? trackPageHref(song.rvtr),
        coverUrl: song.coverUrl,
        reason: null,
      })),
    ),
  );
  if (shelfIsRenderable(relatedCards)) {
    shelves.push({
      id: "related",
      title: relatedShelfTitleFromCards(relatedCards, track),
      reason: null,
      cards: relatedCards,
    });
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
        id: "albums",
        title: "Essential Listening",
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
