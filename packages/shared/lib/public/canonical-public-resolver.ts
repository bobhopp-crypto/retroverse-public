import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { cache } from "react";

import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import { loadTrackPage, type TrackAlbumLink, type TrackPageData } from "@/lib/track/load-track-page";
import {
  loadStaticArtistIdentity, loadStaticLegacyArtistIdentity, loadStaticAlbumIdentity,
} from "@/lib/public/static-canonical-identities";
import type { RankedPrimaryAlbum, PrimaryAlbumResolution } from "@/lib/public/primary-album-policy";

const RE_RVTR = /^RVTR\d{6}$/i;

export type PublicLoaderTiming = {
  name: string;
  durationMs: number;
};

export type CanonicalChartRelationship = {
  chartDate: string;
  chartName: string;
  chartPosition: number;
  weeksOnChart: number;
};

export type CanonicalArtistIdentity = {
  artistId: number;
  rvar: string;
  canonicalName: string;
  displayName: string;
  routeToken: string;
  href: string;
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

export type CanonicalAlbumIdentity = {
  albumId: number;
  artistId: number;
  rval: string;
  title: string;
  releaseYear: number | null;
  artistCanonicalName: string;
  artistDisplayName: string;
  artistHref: string;
  coverUrl: string | null;
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

export type CanonicalTrackResolution = {
  canonicalTrackId: number;
  rvtr: string;
  title: string;
  graphTrackId: number | null;
  trackFamilyId: number | null;
  artist: CanonicalArtistIdentity;
  canonicalYear: number | null;
  firstChartDate: string | null;
  peakHot100Position: number | null;
  chartWeeks: number;
  hasHot100: boolean;
  hasVdjMedia: boolean;
  albumResolution: PrimaryAlbumResolution;
  chartRelationships: CanonicalChartRelationship[];
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

export type CanonicalTrackBatchItem = {
  rvtr: string;
  title: string;
  artist: CanonicalArtistIdentity;
  canonicalYear: number | null;
  albumResolution: PrimaryAlbumResolution;
  chartWeeks: number;
  peakHot100Position: number | null;
  hasHot100: boolean;
};

type TrackIds = { canonical_track_id: number; canonical_title: string; graph_track_id: number | null; track_family_id: number | null };
let idsPromise: Promise<Record<string, TrackIds>> | null = null;

function canonicalIds(): Promise<Record<string, TrackIds>> {
  if (!idsPromise) {
    idsPromise = readFile(join(process.cwd(), "data/static-graph/canonical-track-ids.json.gz"))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, TrackIds>)
      .catch((error) => { idsPromise = null; throw error; });
  }
  return idsPromise;
}

export function canonicalArtistHref(rvar: string): string { return `/artist/${rvar}`; }
export const resolveCanonicalArtist = cache(loadStaticArtistIdentity);
export const resolveLegacyArtistId = cache(loadStaticLegacyArtistIdentity);
export const resolveCanonicalAlbum = cache(loadStaticAlbumIdentity);

export function resolveCanonicalYear(yearParam: string | number): { year: number; resolverPath: string[] } | null {
  const year = normalizeRVYear(yearParam);
  return year == null ? null : { year, resolverPath: [`canonical_year:${year}`, "render"] };
}

function asRankedAlbum(album: TrackAlbumLink, artistId: number): RankedPrimaryAlbum {
  return {
    albumId: album.albumId, artistId, title: album.title, releaseYear: album.releaseYear,
    rval: album.rval, coverUrl: album.coverUrl, relationshipType: null,
    relationshipConfidence: null, canonicalSource: null, membershipConfidence: null,
    reviewFlag: null, position: null, firstBillboard200Date: null,
    policyReason: album.policyReason, reason: album.reason, confidence: album.confidence,
  };
}

function albumResolutionFromPage(page: TrackPageData): PrimaryAlbumResolution {
  const primaryAlbum = page.primaryAlbum ? asRankedAlbum(page.primaryAlbum, page.artistId) : null;
  const secondaryAlbums = page.secondaryAlbums.map((album) => asRankedAlbum(album, page.artistId));
  const albumAppearances = page.albums.map((album) => asRankedAlbum(album, page.artistId));
  return {
    primaryAlbum, secondaryAlbums,
    historicalAlbum: primaryAlbum,
    artworkAlbum: albumAppearances.find((album) => album.coverUrl) ?? primaryAlbum,
    albumAppearances,
    reason: page.primaryAlbumReason,
    confidence: page.primaryAlbumConfidence,
  };
}

async function resolveCanonicalTrackImpl(rvtrParam: string): Promise<CanonicalTrackResolution | null> {
  const rvtr = decodeURIComponent(rvtrParam).trim().toUpperCase();
  if (!RE_RVTR.test(rvtr)) return null;
  const [page, ids] = await Promise.all([loadTrackPage(rvtr), canonicalIds()]);
  if (!page) return null;
  const artist = await resolveCanonicalArtist(page.artistSlug);
  if (!artist) return null;
  const numeric = ids[rvtr];
  const canonicalYear = page.firstChartDate ? Number(page.firstChartDate.slice(0, 4)) : null;
  const chartRelationships = page.trajectoryWeeks.map((week) => ({
    chartDate: week.issueDate, chartName: "Billboard Hot 100", chartPosition: week.rank,
    weeksOnChart: week.weeksOnChart ?? 0,
  }));
  return {
    canonicalTrackId: numeric?.canonical_track_id ?? page.canonicalTrackId,
    rvtr, title: numeric?.canonical_title?.trim() || page.title, graphTrackId: numeric?.graph_track_id ?? null,
    trackFamilyId: numeric?.track_family_id ?? null, artist,
    canonicalYear: Number.isFinite(canonicalYear) ? canonicalYear : null,
    firstChartDate: page.firstChartDate, peakHot100Position: page.peakHot100,
    chartWeeks: page.chartWeeks, hasHot100: page.hasHot100, hasVdjMedia: page.hasVdjMedia,
    albumResolution: albumResolutionFromPage(page), chartRelationships,
    resolverPath: page.resolverPath, loaderTimings: page.loaderTimings,
  };
}

export const resolveCanonicalTrack = cache(resolveCanonicalTrackImpl);

export async function resolveCanonicalTracksBatch(rvtrParams: string[]): Promise<Map<string, CanonicalTrackBatchItem>> {
  const rvtrs = [...new Set(rvtrParams.map((value) => value.trim().toUpperCase()).filter((value) => RE_RVTR.test(value)))];
  const [pages, ids] = await Promise.all([
    Promise.all(rvtrs.map((rvtr) => loadTrackPage(rvtr))),
    canonicalIds(),
  ]);
  const result = new Map<string, CanonicalTrackBatchItem>();
  await Promise.all(pages.map(async (page) => {
    if (!page) return;
    const artist = await resolveCanonicalArtist(page.artistSlug);
    if (!artist) return;
    const year = page.firstChartDate ? Number(page.firstChartDate.slice(0, 4)) : NaN;
    result.set(page.rvtr, {
      rvtr: page.rvtr, title: ids[page.rvtr]?.canonical_title?.trim() || page.title, artist,
      canonicalYear: Number.isFinite(year) ? year : null,
      albumResolution: albumResolutionFromPage(page), chartWeeks: page.chartWeeks,
      peakHot100Position: page.peakHot100, hasHot100: page.hasHot100,
    });
  }));
  return result;
}
