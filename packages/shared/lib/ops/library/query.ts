import { computeSongHealth, songIsReady, songNeedsWork } from "./health";
import type {
  LibraryFilterId,
  LibrarySortId,
  ProductionLibraryCounts,
  ProductionLibrarySong,
} from "./types";

export function playCountBucket(song: ProductionLibrarySong): LibraryFilterId | null {
  const count = song.playCount;
  if (count <= 0) return "play_0";
  if (count === 1) return "play_1";
  if (count <= 5) return "play_2_5";
  if (count <= 25) return "play_6_25";
  return "play_25_plus";
}

export function matchesLibraryFilter(
  song: ProductionLibrarySong,
  filter: LibraryFilterId,
): boolean {
  switch (filter) {
    case "needs_work":
      return songNeedsWork(song);
    case "ready":
      return songIsReady(song);
    case "published":
      return song.publisherStatus === "published";
    case "missing_cover":
      return !song.coverUrl;
    case "missing_story":
      return !song.hasStory;
    case "missing_charts":
      return !song.hasChartJourney;
    case "missing_experience":
      return !song.hasExperience;
    case "collector_complete":
      return song.collectorStatus === "complete";
    case "has_video":
      return song.hasVideo;
    case "no_video":
      return !song.hasVideo;
    case "play_0":
      return song.playCount <= 0;
    case "play_1":
      return song.playCount === 1;
    case "play_2_5":
      return song.playCount >= 2 && song.playCount <= 5;
    case "play_6_25":
      return song.playCount >= 6 && song.playCount <= 25;
    case "play_25_plus":
      return song.playCount > 25;
    default:
      return true;
  }
}

export function filterLibrarySongs(
  songs: ProductionLibrarySong[],
  options: {
    query: string;
    artistQuery: string;
    year: number | null;
    activeFilters: Set<LibraryFilterId>;
  },
): ProductionLibrarySong[] {
  const q = options.query.trim().toLowerCase();
  const artistQ = options.artistQuery.trim().toLowerCase();

  return songs.filter((song) => {
    if (options.year != null && song.year !== options.year) return false;
    if (artistQ && !song.artist.toLowerCase().includes(artistQ)) return false;
    const matchesQuery =
      !q ||
      song.artist.toLowerCase().includes(q) ||
      song.title.toLowerCase().includes(q) ||
      song.rvtr.toLowerCase().includes(q);
    if (!matchesQuery) return false;
    if (options.activeFilters.size === 0) return true;
    for (const filter of options.activeFilters) {
      if (!matchesLibraryFilter(song, filter)) return false;
    }
    return true;
  });
}

function parseIso(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function sortLibrarySongs(
  songs: ProductionLibrarySong[],
  sort: LibrarySortId,
): ProductionLibrarySong[] {
  const next = [...songs];
  next.sort((a, b) => {
    switch (sort) {
      case "play_high":
        return b.playCount - a.playCount || a.title.localeCompare(b.title);
      case "play_low":
        return a.playCount - b.playCount || a.title.localeCompare(b.title);
      case "recently_played":
        return parseIso(b.lastPlay) - parseIso(a.lastPlay) || b.playCount - a.playCount;
      case "recently_added":
        return parseIso(b.firstSeen) - parseIso(a.firstSeen) || b.playCount - a.playCount;
      case "year":
        return (b.year ?? 0) - (a.year ?? 0) || a.artist.localeCompare(b.artist);
      case "artist":
        return (
          a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" }) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
      case "title":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "recently_updated":
        return parseIso(b.lastUpdated) - parseIso(a.lastUpdated);
      default:
        return 0;
    }
  });
  return next;
}

export function buildLibraryCounts(songs: ProductionLibrarySong[]): ProductionLibraryCounts {
  return {
    total: songs.length,
    needsWork: songs.filter((song) => songNeedsWork(song)).length,
    ready: songs.filter((song) => songIsReady(song)).length,
    published: songs.filter((song) => song.publisherStatus === "published").length,
    missingCover: songs.filter((song) => !song.coverUrl).length,
    missingStory: songs.filter((song) => !song.hasStory).length,
    missingCharts: songs.filter((song) => !song.hasChartJourney).length,
    missingExperience: songs.filter((song) => !song.hasExperience).length,
    collectorComplete: songs.filter((song) => song.collectorStatus === "complete").length,
    hasVideo: songs.filter((song) => song.hasVideo).length,
    noVideo: songs.filter((song) => !song.hasVideo).length,
    playCount0: songs.filter((song) => song.playCount <= 0).length,
    playCount1: songs.filter((song) => song.playCount === 1).length,
    playCount2to5: songs.filter((song) => song.playCount >= 2 && song.playCount <= 5).length,
    playCount6to25: songs.filter((song) => song.playCount >= 6 && song.playCount <= 25).length,
    playCount25Plus: songs.filter((song) => song.playCount > 25).length,
  };
}

export { computeSongHealth };
