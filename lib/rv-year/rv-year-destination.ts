import { slugFromArtistName } from "@/lib/artist/slug";
import { numberOneEntriesForWeeks } from "@/lib/artist/chart-snapshot-shaping";
import { chartFamilyKey, weeklyEntriesFromHistory } from "@/lib/artist/chart-history-display";
import type { ArtistChartHistory, ChartHistoryEntry } from "@/lib/artist/chart-history-types";
import { chartEntryPublicHref } from "@/lib/public/canonical-public-hrefs";
import {
  buildCoverToAlbumHrefMap,
  buildHeroCoverCandidates,
  HERO_COVER_SLOT_COUNT,
  isUsableCoverUrl,
  type HeroCoverCandidate,
  type YearHeroCover,
  weeklyCoverScanOrder,
} from "@/lib/rv-year/hero-cover-fill";
import { formatRvYearArtist, formatRvYearTitle } from "@/lib/rv-year/display-format";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";

export type YearEssentialAlbum = {
  title: string;
  artist: string;
  coverUrl: string;
  href: string | null;
  caption: string;
};

export type YearDefiningSong = {
  title: string;
  artist: string;
  coverUrl: string | null;
  href: string | null;
};

export type YearDefiningArtist = {
  name: string;
  slug: string;
  href: string | null;
};

/** Chart-ranked #1 leader for year page emphasis (weeks at #1). */
export type YearChartLeader = {
  title: string;
  artist: string;
  coverUrl: string | null;
  href: string | null;
  weeksAtOne: number;
  rvtr: string | null;
  coverageStatus?: TrackCoverageStatus | null;
};

export type RvYearDestination = {
  essentialAlbums: YearEssentialAlbum[];
  heroCovers: YearHeroCover[];
  definingArtists: YearDefiningArtist[];
  definingSongs: YearDefiningSong[];
  topSingles: YearChartLeader[];
  topAlbums: YearChartLeader[];
};

export type RvYearDestinationDraft = RvYearDestination & {
  heroCoverCandidates: HeroCoverCandidate[];
};

type EntityWeeks = {
  title: string;
  artist: string;
  trackId: string;
  coverUrl: string | null;
  weeksAtOne: number;
  firstDate: string;
};

type YearCoverPools = {
  artistCover: Map<string, string>;
  albumCoverByArtist: Map<string, string>;
  allCovers: string[];
};

function entityKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
}

function isUsableCover(url: string | null | undefined): url is string {
  return isUsableCoverUrl(url);
}

function entryHref(
  entry: Pick<ChartHistoryEntry, "trackId" | "title" | "artist">,
  isAlbum: boolean,
): string | null {
  return chartEntryPublicHref(entry.trackId, isAlbum);
}

function rankNumberOnes(
  entries: ChartHistoryEntry[],
  rvYear: number,
  family: "hot-100" | "album-200",
  limit: number,
): EntityWeeks[] {
  const inYear = entries.filter((row) => row.year === rvYear);
  const weeklyOnes = numberOneEntriesForWeeks(inYear, family);
  if (!weeklyOnes.length) return [];

  const counts = new Map<string, EntityWeeks>();
  for (const row of weeklyOnes) {
    const key = entityKey(row.title, row.artist);
    const existing = counts.get(key);
    if (!existing) {
      counts.set(key, {
        title: row.title,
        artist: row.artist,
        trackId: row.trackId,
        coverUrl: isUsableCover(row.coverUrl) ? row.coverUrl : null,
        weeksAtOne: 1,
        firstDate: row.chartDate,
      });
      continue;
    }
    existing.weeksAtOne += 1;
    if (isUsableCover(row.coverUrl) && !existing.coverUrl) existing.coverUrl = row.coverUrl;
    if (row.chartDate < existing.firstDate) existing.firstDate = row.chartDate;
  }

  return [...counts.values()]
    .sort((a, b) => {
      if (b.weeksAtOne !== a.weeksAtOne) return b.weeksAtOne - a.weeksAtOne;
      return a.firstDate.localeCompare(b.firstDate);
    })
    .slice(0, limit);
}

function buildCoverPools(entries: ChartHistoryEntry[], rvYear: number): YearCoverPools {
  const artistCover = new Map<string, string>();
  const albumCoverByArtist = new Map<string, string>();
  const allCovers: string[] = [];
  const seen = new Set<string>();

  for (const row of entries) {
    if (row.year !== rvYear || !isUsableCover(row.coverUrl)) continue;
    const artistKey = row.artist.trim().toLowerCase();
    if (!artistCover.has(artistKey)) artistCover.set(artistKey, row.coverUrl);
    if (chartFamilyKey(row.chartName) === "album-200" && !albumCoverByArtist.has(artistKey)) {
      albumCoverByArtist.set(artistKey, row.coverUrl);
    }
    if (!seen.has(row.coverUrl)) {
      seen.add(row.coverUrl);
      allCovers.push(row.coverUrl);
    }
  }

  return { artistCover, albumCoverByArtist, allCovers };
}

function resolveSongCover(row: EntityWeeks, pools: YearCoverPools): string | null {
  if (isUsableCover(row.coverUrl)) return row.coverUrl;
  const artistKey = row.artist.trim().toLowerCase();
  const album = pools.albumCoverByArtist.get(artistKey);
  if (album) return album;
  return pools.artistCover.get(artistKey) ?? null;
}

function definingArtistsFromYear(
  entries: ChartHistoryEntry[],
  rvYear: number,
  limit = 6,
): YearDefiningArtist[] {
  const ranked = rankNumberOnes(entries, rvYear, "hot-100", limit * 2);
  const seen = new Set<string>();
  const artists: YearDefiningArtist[] = [];

  for (const row of ranked) {
    const name = formatRvYearArtist(row.artist.trim());
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artists.push({
      name,
      slug: slugFromArtistName(name),
      href: `/artist/${slugFromArtistName(name)}`,
    });
    if (artists.length >= limit) break;
  }

  return artists;
}

function buildHeroCoverCandidateList(
  essentialAlbums: YearEssentialAlbum[],
  definingSongs: YearDefiningSong[],
  pools: YearCoverPools,
  weekly: ChartHistoryEntry[],
  rvYear: number,
): HeroCoverCandidate[] {
  const albumRank = rankNumberOnes(weekly, rvYear, "album-200", 32);
  const songRank = rankNumberOnes(weekly, rvYear, "hot-100", 24);
  const hrefByCoverUrl = buildCoverToAlbumHrefMap(weekly, rvYear);
  for (const album of essentialAlbums) {
    if (album.href) hrefByCoverUrl.set(album.coverUrl, album.href);
  }

  return buildHeroCoverCandidates({
    essentialAlbumCovers: essentialAlbums.map((album) => ({
      coverUrl: album.coverUrl,
      href: album.href,
    })),
    definingSongCovers: definingSongs.map((song) => song.coverUrl),
    rankedAlbumCovers: albumRank.map((row) => row.coverUrl),
    rankedSongCovers: songRank.map((row) => resolveSongCover(row, pools)),
    poolCovers: pools.allCovers,
    weeklyCovers: weeklyCoverScanOrder(weekly, rvYear),
    hrefByCoverUrl,
  });
}

export function buildRvYearDestination(
  history: ArtistChartHistory,
  rvYear: number,
): RvYearDestinationDraft {
  const weekly = weeklyEntriesFromHistory(history);
  const pools = buildCoverPools(weekly, rvYear);

  const albumRank = rankNumberOnes(weekly, rvYear, "album-200", 24);
  const essentialAlbums: YearEssentialAlbum[] = [];
  for (const row of albumRank) {
    if (!isUsableCover(row.coverUrl)) continue;
    essentialAlbums.push({
      title: formatRvYearTitle(row.title),
      artist: formatRvYearArtist(row.artist),
      coverUrl: row.coverUrl,
      href: entryHref(row, true),
      caption: formatRvYearArtist(row.artist),
    });
    if (essentialAlbums.length >= 8) break;
  }

  const songRank = rankNumberOnes(weekly, rvYear, "hot-100", 12);
  const definingSongs: YearDefiningSong[] = songRank.slice(0, 8).map((row) => ({
    title: formatRvYearTitle(row.title),
    artist: formatRvYearArtist(row.artist),
    coverUrl: resolveSongCover(row, pools),
    href: entryHref(row, false),
  }));

  const definingArtists = definingArtistsFromYear(weekly, rvYear, 6);
  const heroCoverCandidates = buildHeroCoverCandidateList(
    essentialAlbums,
    definingSongs,
    pools,
    weekly,
    rvYear,
  );
  const heroCovers: YearHeroCover[] = heroCoverCandidates.slice(0, HERO_COVER_SLOT_COUNT);

  const topSingles: YearChartLeader[] = songRank.slice(0, 5).map((row) => ({
    title: formatRvYearTitle(row.title),
    artist: formatRvYearArtist(row.artist),
    coverUrl: resolveSongCover(row, pools),
    href: entryHref(row, false),
    weeksAtOne: row.weeksAtOne,
    rvtr: row.trackId?.match(/RVTR\d{6}/i)?.[0]?.toUpperCase() ?? null,
  }));

  const topAlbums: YearChartLeader[] = albumRank.slice(0, 5).map((row) => ({
    title: formatRvYearTitle(row.title),
    artist: formatRvYearArtist(row.artist),
    coverUrl: isUsableCover(row.coverUrl) ? row.coverUrl : null,
    href: entryHref(row, true),
    weeksAtOne: row.weeksAtOne,
    rvtr: null,
  }));

  return {
    essentialAlbums,
    heroCovers,
    heroCoverCandidates,
    definingArtists,
    definingSongs,
    topSingles,
    topAlbums,
  };
}
