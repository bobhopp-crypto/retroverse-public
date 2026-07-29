/**
 * Unified public song payload — single source for all patron song rendering.
 *
 * Resolution order:
 *   1. Valid RVTR
 *   2. Canonical graph (Postgres via loadTrackPage)
 *   3. Published/bundled SongPackage
 *   4. VirtualDJ library metadata
 *   5. Empty only when no usable identity can be formed
 */
import "server-only";

import { cache } from "react";

import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import type { SongPackage, StoryCard, TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import { trackPageHref } from "@/lib/search/entity-routes";
import { loadApprovedLocalSongContent, type LocalSongContent } from "@/lib/retroverse/song-content";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";
import type { RendererCard } from "@/lib/universal-renderer/card-types";
import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";
import { loadUniversalPackage } from "@/lib/universal-renderer/load-package";
import { loadVdjBasePackageByRvtr } from "@/lib/universal-renderer/load-vdj-base";
import type { ExternalDiscoveryQuery } from "@/lib/public/external-search";

const RVTR_RE = /^RVTR\d{6}$/i;

export type PublicSongVdjHint = {
  artist?: string | null;
  title?: string | null;
  album?: string | null;
  year?: number | null;
  coverUrl?: string | null;
};

export type PublicSongResolutionStatus = "graph" | "package" | "vdj" | "partial" | "empty";

export type PublicSongStoryCard = {
  headline: string;
  body: string;
  sourceUrl: string | null;
};

export type PublicSongPayload = {
  rvtr: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  coverUrl: string | null;
  track: TrackPageData | null;
  localContent: LocalSongContent | null;
  trivia: string[];
  timeline: TimelineEvent[];
  storyCards: PublicSongStoryCard[];
  packageCards: RendererCard[] | null;
  universalPackage: UniversalPackagePayload | null;
  vdjPackage: UniversalPackagePayload | null;
  vdj: PublicSongVdjHint | null;
  links: {
    songHref: string;
    artistHref: string | null;
    albumHref: string | null;
    yearHref: string | null;
  };
  externalDiscovery: ExternalDiscoveryQuery;
  resolution: PublicSongResolutionStatus;
  warnings: string[];
  resolverPath: string[];
};

function normalizeRvtr(raw: string): string | null {
  const decoded = decodeURIComponent(raw).trim().toUpperCase();
  return RVTR_RE.test(decoded) ? decoded : null;
}

function trackYear(track: TrackPageData): number | null {
  if (track.releaseYear) return track.releaseYear;
  const fromChart = track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : NaN;
  if (Number.isFinite(fromChart) && fromChart > 0) return fromChart;
  return track.albums[0]?.releaseYear ?? null;
}

function albumTitleFromPackage(pkg: SongPackage | null): string | null {
  const title = pkg?.metadata.albumTitle?.trim();
  return title || null;
}

function yearFromPackage(pkg: SongPackage | null): number | null {
  const year = pkg?.metadata.year;
  return typeof year === "number" && Number.isFinite(year) ? year : null;
}

function extractTrivia(pkg: SongPackage | null): string[] {
  if (!pkg) return [];
  return pkg.candidateFacts
    .filter((fact) => fact.category === "trivia" && fact.reviewStatus === "approved")
    .map((fact) => fact.factText.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function extractTimeline(pkg: SongPackage | null): TimelineEvent[] {
  if (!pkg?.intel?.timelineEvents?.length) return [];
  return pkg.intel.timelineEvents.filter((event) => event.title?.trim() || event.description?.trim());
}

function extractStoryCards(pkg: SongPackage | null): PublicSongStoryCard[] {
  if (!pkg?.storyCards?.length) return [];
  return pkg.storyCards
    .filter((card: StoryCard) => !card.hidden && card.headline?.trim() && card.fact?.trim())
    .slice(0, 8)
    .map((card) => ({
      headline: card.headline.trim(),
      body: card.fact.trim(),
      sourceUrl: card.sourceUrl ?? null,
    }));
}

function albumFromVdjCards(cards: RendererCard[] | null | undefined): string | null {
  if (!cards?.length) return null;
  const albumCard = cards.find((card) => card.kind === "album");
  if (albumCard?.kind === "album") return albumCard.albumTitle?.trim() || null;
  return null;
}

function buildPayload(
  rvtr: string,
  input: {
    track: TrackPageData | null;
    songPackage: SongPackage | null;
    universalCards: RendererCard[] | null;
    universalPackage: UniversalPackagePayload | null;
    vdjPayload: UniversalPackagePayload | null;
    localContent: LocalSongContent | null;
    vdjHint: PublicSongVdjHint | null;
  },
): PublicSongPayload {
  const warnings: string[] = [];
  const resolverPath: string[] = [];

  const { track, songPackage, universalCards, universalPackage, vdjPayload, localContent, vdjHint } = input;

  if (track) resolverPath.push("graph:loadTrackPage");
  if (songPackage) resolverPath.push("package:loadSongPackage");
  if (universalCards?.length) resolverPath.push("package:loadUniversalPackage");
  if (vdjPayload) resolverPath.push("vdj:loadVdjBasePackageByRvtr");
  if (vdjHint?.title || vdjHint?.artist) resolverPath.push("vdj:runtime-hint");

  const vdjMeta: PublicSongVdjHint | null = vdjPayload
    ? {
        artist: vdjPayload.artist,
        title: vdjPayload.title,
        album: albumFromVdjCards(vdjPayload.cards),
        year: vdjPayload.year,
        coverUrl: null,
      }
    : vdjHint?.artist || vdjHint?.title
      ? {
          artist: vdjHint.artist ?? "",
          title: vdjHint.title ?? "",
          album: vdjHint.album ?? null,
          year: vdjHint.year ?? null,
          coverUrl: vdjHint.coverUrl ?? null,
        }
      : null;

  const title =
    track?.title?.trim() ||
    songPackage?.metadata.title?.trim() ||
    vdjPayload?.title?.trim() ||
    vdjHint?.title?.trim() ||
    "";

  const artist =
    track?.artistName?.trim() ||
    songPackage?.metadata.artist?.trim() ||
    vdjPayload?.artist?.trim() ||
    vdjHint?.artist?.trim() ||
    "";

  const album =
    track?.primaryAlbum?.title?.trim() ||
    albumTitleFromPackage(songPackage) ||
    albumFromVdjCards(vdjPayload?.cards) ||
    albumFromVdjCards(universalCards) ||
    vdjHint?.album?.trim() ||
    null;

  const year =
    (track ? trackYear(track) : null) ??
    yearFromPackage(songPackage) ??
    vdjPayload?.year ??
    vdjHint?.year ??
    null;

  const coverUrl =
    track?.coverUrl ??
    songPackage?.metadata.coverUrl ??
    vdjHint?.coverUrl ??
    null;

  const artistHref = track?.artistHref ?? null;
  const albumHref = track?.primaryAlbum?.href ?? null;
  const yearHref = track?.rvYearHref ?? (year ? `/rv/${year}` : null);

  if (!title || !artist) {
    if (!title) warnings.push("missing-title");
    if (!artist) warnings.push("missing-artist");
  }
  if (track && !track.hasHot100) warnings.push("no-hot100-chart");
  if (!track && !songPackage && !vdjPayload && vdjMeta) warnings.push("vdj-metadata-only");

  let resolution: PublicSongResolutionStatus = "empty";
  if (track) resolution = "graph";
  else if (songPackage || universalCards?.length) resolution = "package";
  else if (vdjPayload || vdjMeta) resolution = vdjMeta && !vdjPayload ? "partial" : "vdj";
  else if (title && artist) resolution = "partial";

  return {
    rvtr,
    title,
    artist,
    album,
    year,
    coverUrl,
    track,
    localContent,
    trivia: extractTrivia(songPackage),
    timeline: extractTimeline(songPackage),
    storyCards: extractStoryCards(songPackage),
    packageCards: universalCards,
    universalPackage: input.universalPackage,
    vdjPackage: vdjPayload,
    vdj: vdjMeta,
    links: {
      songHref: trackPageHref(rvtr),
      artistHref,
      albumHref,
      yearHref,
    },
    externalDiscovery: {
      entityType: "song",
      title,
      artist,
      album,
      year,
    },
    resolution,
    warnings,
    resolverPath,
  };
}

async function loadPublicSongPayloadImpl(
  rvtrParam: string,
  vdjHint?: PublicSongVdjHint | null,
): Promise<PublicSongPayload> {
  const rvtr = normalizeRvtr(rvtrParam);
  if (!rvtr) {
    return buildPayload(rvtrParam.trim().toUpperCase() || "UNKNOWN", {
      track: null,
      songPackage: null,
      universalCards: null,
      universalPackage: null,
      vdjPayload: null,
      localContent: null,
      vdjHint: vdjHint ?? null,
    });
  }

  const [track, songPackage, universalPackage, vdjPayload, localContent] = await Promise.all([
    loadTrackPage(rvtr),
    loadSongPackage(rvtr),
    loadUniversalPackage(rvtr),
    loadVdjBasePackageByRvtr(rvtr),
    loadApprovedLocalSongContent(rvtr),
  ]);

  return buildPayload(rvtr, {
    track,
    songPackage,
    universalCards: universalPackage?.cards ?? null,
    universalPackage,
    vdjPayload,
    localContent,
    vdjHint: vdjHint ?? null,
  });
}

export const loadPublicSongPayload = cache(loadPublicSongPayloadImpl);

export function isPublicSongPayloadRenderable(payload: PublicSongPayload): boolean {
  return payload.resolution !== "empty" && Boolean(payload.title.trim() && payload.artist.trim());
}
