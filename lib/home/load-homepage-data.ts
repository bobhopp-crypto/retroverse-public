import "server-only";

import { cache } from "react";

import { ARTIST_SLUGS } from "@/lib/artist/slug";
import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadBrowserPlusModel } from "@/lib/ops/browser-plus/load-browser-plus";
import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";
import { maybeAdvanceLiveChannel } from "@/lib/live-control/engine";
import { loadLiveControlState } from "@/lib/live-control/state";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { trackPageHref } from "@/lib/search/entity-routes";
import { loadTrackPage } from "@/lib/track/load-track-page";

import type {
  HomeDiscoverSong,
  HomeFeaturedArtist,
  HomeMediaCard,
  HomeNowPlaying,
  HomepageData,
} from "./homepage-types";

const YEAR_MIN = 1955;
const YEAR_MAX = 2005;
const ROW_LIMIT = 14;

const DISCOVER_FALLBACK_RVTRS = [
  "RVTR792762",
  "RVTR285085",
  "RVTR572817",
  "RVTR758008",
  "RVTR478078",
  "RVTR347287",
  "RVTR727463",
  "RVTR469359",
] as const;

function rowToMediaCard(row: BrowserPlusRow): HomeMediaCard | null {
  const href = row.rvtr ? trackPageHref(row.rvtr) : null;
  if (!href) return null;

  return {
    rvtr: row.rvtr,
    title: row.title.trim() || row.fileName,
    artist: row.artist.trim() || "Unknown artist",
    year: row.year,
    coverUrl: row.retroverseCoverUrl ?? row.thumbnailUrl,
    href,
    playCount: row.playCount,
  };
}

function isVideoRow(row: BrowserPlusRow): boolean {
  return row.isVideo && row.fileExists && row.mediaKind === "video";
}

function firstSeenMs(row: BrowserPlusRow): number {
  if (!row.firstSeen) return 0;
  const ms = Date.parse(row.firstSeen);
  return Number.isFinite(ms) ? ms : 0;
}

function buildRecentVideos(rows: BrowserPlusRow[]): HomeMediaCard[] {
  return [...rows]
    .filter(isVideoRow)
    .sort((a, b) => firstSeenMs(b) - firstSeenMs(a))
    .map(rowToMediaCard)
    .filter((card): card is HomeMediaCard => card != null)
    .slice(0, ROW_LIMIT);
}

function buildPopularSongs(rows: BrowserPlusRow[]): HomeMediaCard[] {
  const byRvtr = new Map<string, HomeMediaCard>();

  for (const row of rows) {
    if (!isVideoRow(row) || !row.rvtr) continue;
    const card = rowToMediaCard(row);
    if (!card) continue;
    const key = row.rvtr.toUpperCase();
    const existing = byRvtr.get(key);
    if (!existing || (card.playCount ?? 0) > (existing.playCount ?? 0)) {
      byRvtr.set(key, card);
    }
  }

  return [...byRvtr.values()]
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .slice(0, ROW_LIMIT);
}

export async function loadBridgeNowPlaying(): Promise<HomeNowPlaying | null> {
  await maybeAdvanceLiveChannel();
  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);

  const bridgeActive =
    state.live?.source === "bridge" &&
    Boolean(state.currentTrackId?.trim()) &&
    Boolean(state.live.title?.trim());

  if (!bridgeActive) return null;

  const payload = await buildSundayNightsCurrentPayload(state, control);
  const track = payload.track;
  const live = payload.live;

  return {
    title: track?.title ?? live?.title ?? "Unknown title",
    artist: track?.artistName ?? live?.artist ?? "Unknown artist",
    year: track?.releaseYear ?? live?.year ?? null,
    coverUrl: track?.coverUrl ?? live?.coverUrl ?? null,
    rvtr: payload.currentTrackId,
    liveHref: "/retroverse-2/live",
  };
}

async function loadDiscoverSong(): Promise<HomeDiscoverSong | null> {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  let rvtrPool: string[] = [...DISCOVER_FALLBACK_RVTRS];

  const ping = await inspectPing();
  if (ping.ok) {
    const rows = await inspectQuery<{ rvtr: string }>(
      `
      SELECT track_id AS rvtr
      FROM canonical_track_display
      WHERE has_hot100 = true AND peak_hot100_position IS NOT NULL
      ORDER BY peak_hot100_position ASC, chart_weeks DESC NULLS LAST
      LIMIT 64
      `,
    );
    if (rows.length > 0) {
      rvtrPool = rows.map((row) => row.rvtr.toUpperCase());
    }
  }

  const rvtr = rvtrPool[dayIndex % rvtrPool.length];
  if (!rvtr) return null;

  try {
    const track = await loadTrackPage(rvtr);
    if (!track) return null;
    return {
      title: track.title,
      artist: track.artistName,
      year: track.releaseYear,
      coverUrl: track.coverUrl,
      rvtr: track.rvtr,
      songHref: trackPageHref(track.rvtr),
    };
  } catch {
    return null;
  }
}

async function loadFeaturedArtists(): Promise<HomeFeaturedArtist[]> {
  const slugs = Object.keys(ARTIST_SLUGS);
  const cards = await Promise.all(
    slugs.map(async (slug) => {
      const fallbackName = ARTIST_SLUGS[slug] ?? slug;
      try {
        const page = await loadArtistPage(slug);
        const coverUrl =
          page.heroImageUrl ??
          page.essentialAlbums[0]?.coverUrl ??
          page.signatureTracks[0]?.coverUrl ??
          null;
        return {
          slug,
          name: page.displayName,
          href: `/artist/${slug}`,
          coverUrl,
        } satisfies HomeFeaturedArtist;
      } catch {
        return {
          slug,
          name: fallbackName,
          href: `/artist/${slug}`,
          coverUrl: null,
        } satisfies HomeFeaturedArtist;
      }
    }),
  );

  return cards;
}

export const loadHomepageData = cache(async (): Promise<HomepageData> => {
  const [nowPlaying, discoverSong, vdjModel, featuredArtists] = await Promise.all([
    loadBridgeNowPlaying(),
    loadDiscoverSong(),
    loadBrowserPlusModel().catch(() => null),
    loadFeaturedArtists(),
  ]);

  const rows = vdjModel?.rows ?? [];
  const years: number[] = [];
  for (let year = YEAR_MIN; year <= YEAR_MAX; year += 1) {
    years.push(year);
  }

  return {
    nowPlaying,
    discoverSong: nowPlaying ? null : discoverSong,
    recentVideos: buildRecentVideos(rows),
    popularSongs: buildPopularSongs(rows),
    featuredArtists,
    years,
  };
});
